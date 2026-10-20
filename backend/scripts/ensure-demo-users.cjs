require("dotenv").config();
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mariadb = require("mariadb");

const STAFF_PASSWORD = "Onothiti1";
const OTP_HINT = "123456";

const USERS = {
  customer: { mobile: "0504444444", displayName: "سارة", accountType: "CUSTOMER", prefix: "CU" },
  provider: { mobile: "0501111111", displayName: "نورة", accountType: "PROVIDER", prefix: "BM" },
  operator: { mobile: "0500000002", displayName: "مشغلة التشغيل", accountType: "STAFF", prefix: "ST", roleCodes: ["OE", "OPERATOR"], team: "OPS", titleAr: "مشغل", level: 1 },
  finance: { mobile: "0500000003", displayName: "المديرة المالية", accountType: "STAFF", prefix: "ST", roleCodes: ["FM", "FINANCE"], team: "FINANCE", titleAr: "مدير مالي", level: 3 },
};

const LEGACY_GRANTS = {
  OPERATOR: [
    "PROVIDERS_APPROVE",
    "CUSTOMERS_REVIEW",
    "ACCOUNTS_ACTION",
    "PAYMENTS_REVIEW",
    "ESCALATE_FINANCE",
    "TICKETS_MANAGE",
    "RATINGS_REVIEW",
    "REPORTS_VIEW",
    "MEDIA_REVIEW",
    "PACKAGES_MANAGE",
    "GEO_MANAGE",
    "CATALOG_MANAGE",
  ],
  OE: [
    "PROVIDERS_APPROVE",
    "CUSTOMERS_REVIEW",
    "ACCOUNTS_ACTION",
    "PAYMENTS_REVIEW",
    "ESCALATE_FINANCE",
    "TICKETS_MANAGE",
    "RATINGS_REVIEW",
    "REPORTS_VIEW",
    "MEDIA_REVIEW",
    "PACKAGES_MANAGE",
    "GEO_MANAGE",
    "CATALOG_MANAGE",
  ],
  FINANCE: ["PAYMENTS_REVIEW", "PAYMENTS_CONFIRM", "REPORTS_VIEW", "MEDIA_REVIEW"],
  FM: ["PAYMENTS_REVIEW", "PAYMENTS_CONFIRM", "REPORTS_VIEW", "MEDIA_REVIEW"],
};

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

async function hasColumn(conn, table, column) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.MYSQL_DATABASE, table, column],
  );
  return Number(rows[0].n) > 0;
}

async function ensureSchema(conn) {
  if (!(await hasColumn(conn, "user", "mustChangePassword"))) {
    await conn.query(
      "ALTER TABLE `user` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false",
    );
  }
  if (!(await hasColumn(conn, "staffuser", "titleAr"))) {
    await conn.query("ALTER TABLE `staffuser` ADD COLUMN `titleAr` VARCHAR(80) NULL");
  }
  if (!(await hasColumn(conn, "staffuser", "teamId"))) {
    await conn.query("ALTER TABLE `staffuser` ADD COLUMN `teamId` CHAR(36) NULL");
  }
  if (!(await hasColumn(conn, "staffuser", "customPermissions"))) {
    await conn.query(
      "ALTER TABLE `staffuser` ADD COLUMN `customPermissions` BOOLEAN NOT NULL DEFAULT 0",
    );
  }
}

function loadMatrix() {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "prisma", "permission-matrix.json"), "utf8"),
    );
  } catch {
    return { roles: [], permissions: [] };
  }
}

function matrixGrants(roleCode) {
  return loadMatrix().permissions.filter((row) => row.grants?.[roleCode]).map((row) => row.code);
}

async function ensureRole(conn, code, nameAr, nameEn) {
  const existing = await conn.query("SELECT id FROM `role` WHERE `code` = ?", [code]);
  if (existing.length) {
    return existing[0].id;
  }
  const id = randomUUID();
  await conn.query("INSERT INTO `role` (`id`, `code`, `nameAr`, `nameEn`) VALUES (?, ?, ?, ?)", [
    id,
    code,
    nameAr,
    nameEn,
  ]);
  return id;
}

async function ensurePermission(conn, code, nameAr = code) {
  const existing = await conn.query("SELECT id FROM `permission` WHERE `code` = ?", [code]);
  if (existing.length) {
    return existing[0].id;
  }
  const id = randomUUID();
  const hasGroup = await hasColumn(conn, "permission", "groupAr");
  if (hasGroup) {
    await conn.query(
      "INSERT INTO `permission` (`id`, `code`, `nameAr`, `nameEn`, `groupAr`, `sortOrder`) VALUES (?, ?, ?, ?, '', 0)",
      [id, code, nameAr, code],
    );
  } else {
    await conn.query("INSERT INTO `permission` (`id`, `code`, `nameAr`, `nameEn`) VALUES (?, ?, ?, ?)", [
      id,
      code,
      nameAr,
      code,
    ]);
  }
  return id;
}

async function grantRole(conn, roleId, codes) {
  for (const code of codes) {
    const permId = await ensurePermission(conn, code);
    await conn.query(
      "INSERT IGNORE INTO `rolepermission` (`roleId`, `permissionId`) VALUES (?, ?)",
      [roleId, permId],
    );
  }
}

async function copyRolePerms(conn, fromCode, toRoleId) {
  const from = await conn.query("SELECT id FROM `role` WHERE `code` = ?", [fromCode]);
  if (!from.length) {
    return;
  }
  await conn.query(
    `INSERT IGNORE INTO \`rolepermission\` (\`roleId\`, \`permissionId\`)
     SELECT ?, \`permissionId\` FROM \`rolepermission\` WHERE \`roleId\` = ?`,
    [toRoleId, from[0].id],
  );
}

async function permissionCount(conn, roleId) {
  const rows = await conn.query(
    "SELECT COUNT(*) AS n FROM `rolepermission` WHERE `roleId` = ?",
    [roleId],
  );
  return Number(rows[0].n);
}

async function nextAccountCode(conn, accountType, prefix) {
  const rows = await conn.query(
    "SELECT `accountCode` FROM `user` WHERE `accountType` = ? AND `accountCode` LIKE ? ORDER BY `accountCode` DESC LIMIT 1",
    [accountType, `${prefix}-%`],
  );
  const last = rows[0]?.accountCode?.split("-")[1];
  const n = Number(last);
  const next = Number.isFinite(n) ? n + 1 : 1;
  return `${prefix}-${String(next).padStart(6, "0")}`;
}

async function upsertUser(conn, spec, extra = {}) {
  const existing = await conn.query("SELECT id, accountType, accountCode FROM `user` WHERE mobile = ?", [
    spec.mobile,
  ]);
  if (existing.length && existing[0].accountType !== spec.accountType) {
    throw new Error(`${spec.mobile} مستخدم لنوع حساب آخر (${existing[0].accountType})`);
  }
  const passwordHash = await bcrypt.hash(STAFF_PASSWORD, 10);
  const now = new Date();
  if (existing.length) {
    await conn.query(
      `UPDATE \`user\`
       SET displayName = ?, status = 'ACTIVE', passwordHash = ?, mustChangePassword = 0,
           mobileVerifiedAt = ?, lastActiveAt = ?, termsAcceptedAt = ?, updatedAt = ?
       WHERE id = ?`,
      [spec.displayName, passwordHash, now, now, now, now, existing[0].id],
    );
    return existing[0].id;
  }
  const id = randomUUID();
  const accountCode = extra.accountCode || (await nextAccountCode(conn, spec.accountType, spec.prefix));
  await conn.query(
    `INSERT INTO \`user\`
      (id, accountType, mobile, passwordHash, mustChangePassword, status, displayName, accountCode, mobileVerifiedAt, lastActiveAt, termsAcceptedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 0, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)`,
    [id, spec.accountType, spec.mobile, passwordHash, spec.displayName, accountCode, now, now, now, now, now],
  );
  return id;
}

async function main() {
  const conn = await mariadb.createConnection({
    host: mysqlHost(),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE,
    charset: "utf8mb4",
    collation: "utf8mb4_unicode_ci",
    allowPublicKeyRetrieval: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await ensureSchema(conn);
    const operatorRoleId = await ensureRole(conn, "OE", "موظف تشغيل", "Operations officer");
    const financeRoleId = await ensureRole(conn, "FM", "المدير المالي", "Finance manager");
    await ensureRole(conn, "OPERATOR", "مشغل", "Operator");
    await ensureRole(conn, "FINANCE", "مالي", "Finance");

    for (const perm of loadMatrix().permissions) {
      await ensurePermission(conn, perm.code, perm.nameAr || perm.code);
    }
    await grantRole(conn, operatorRoleId, [...new Set([...LEGACY_GRANTS.OE, ...matrixGrants("OE")])]);
    await grantRole(conn, financeRoleId, [...new Set([...LEGACY_GRANTS.FM, ...matrixGrants("FM")])]);
    await copyRolePerms(conn, "OPERATOR", operatorRoleId);
    await copyRolePerms(conn, "FINANCE", financeRoleId);
    console.log(`OE perms ${await permissionCount(conn, operatorRoleId)}`);
    console.log(`FM perms ${await permissionCount(conn, financeRoleId)}`);

    const customerId = await upsertUser(conn, USERS.customer);
    const customerProfile = await conn.query("SELECT userId FROM `customerprofile` WHERE userId = ?", [customerId]);
    if (!customerProfile.length) {
      const city = await conn.query("SELECT id FROM `city` ORDER BY sortOrder ASC LIMIT 1");
      await conn.query("INSERT INTO `customerprofile` (userId, cityId) VALUES (?, ?)", [
        customerId,
        city[0]?.id ?? null,
      ]);
    }

    const providerId = await upsertUser(conn, USERS.provider, { accountCode: "BM-000001" });
    const city = await conn.query("SELECT id FROM `city` WHERE code = 'RIYADH' LIMIT 1");
    const cityId = city[0]?.id ?? null;
    const providerProfile = await conn.query("SELECT userId FROM `providerprofile` WHERE userId = ?", [providerId]);
    if (!providerProfile.length) {
      await conn.query(
        "INSERT INTO `providerprofile` (userId, bio, whatsapp, cityId, visibility, badge) VALUES (?, ?, ?, ?, 'PUBLIC', ?)",
        [providerId, "خبيرة شعر في الرياض", USERS.provider.mobile, cityId, "ذهبية"],
      );
    } else {
      await conn.query(
        "UPDATE `providerprofile` SET visibility = 'PUBLIC', badge = COALESCE(badge, 'ذهبية'), cityId = COALESCE(cityId, ?) WHERE userId = ?",
        [cityId, providerId],
      );
    }
    const gold = await conn.query("SELECT id FROM `package` WHERE code = 'GOLD' LIMIT 1");
    if (gold.length) {
      const sub = await conn.query(
        "SELECT id FROM `subscription` WHERE providerUserId = ? AND status = 'ACTIVE' LIMIT 1",
        [providerId],
      );
      if (!sub.length) {
        const end = new Date();
        end.setMonth(end.getMonth() + 6);
        await conn.query(
          "INSERT INTO `subscription` (id, providerUserId, packageId, startAt, endAt, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')",
          [randomUUID(), providerId, gold[0].id, new Date(), end],
        );
      }
    }

    const operatorId = await upsertUser(conn, USERS.operator);
    await conn.query(
      `INSERT INTO \`staffuser\` (userId, roleId, team, titleAr, level, customPermissions)
       VALUES (?, ?, 'OPS', ?, 1, 0)
       ON DUPLICATE KEY UPDATE roleId = VALUES(roleId), team = VALUES(team), titleAr = VALUES(titleAr), level = VALUES(level), customPermissions = 0`,
      [operatorId, operatorRoleId, USERS.operator.titleAr],
    );

    const financeId = await upsertUser(conn, USERS.finance);
    await conn.query(
      `INSERT INTO \`staffuser\` (userId, roleId, team, titleAr, level, customPermissions)
       VALUES (?, ?, 'FINANCE', ?, 3, 0)
       ON DUPLICATE KEY UPDATE roleId = VALUES(roleId), team = VALUES(team), titleAr = VALUES(titleAr), level = VALUES(level), customPermissions = 0`,
      [financeId, financeRoleId, USERS.finance.titleAr],
    );

    console.log("USERS_READY");
    console.log(`عميلة     ${USERS.customer.mobile}  ${USERS.customer.displayName}   OTP ${OTP_HINT}`);
    console.log(`خبيرة     ${USERS.provider.mobile}  ${USERS.provider.displayName}   OTP ${OTP_HINT}`);
    console.log(`مشغل      ${USERS.operator.mobile}  ${USERS.operator.displayName}   OTP ${OTP_HINT} ثم كلمة المرور ${STAFF_PASSWORD}`);
    console.log(`مدير مالي ${USERS.finance.mobile}  ${USERS.finance.displayName}   OTP ${OTP_HINT} ثم كلمة المرور ${STAFF_PASSWORD}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
