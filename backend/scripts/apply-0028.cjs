require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mariadb = require("mariadb");

const SUPER_ROLE = "SUPER";
const SUPER_MOBILE = process.argv[2] || process.env.SUPER_ADMIN_MOBILE || "";
const SUPER_PASSWORD = process.argv[3] || process.env.SUPER_ADMIN_PASSWORD || "";
const SUPER_NAME = process.argv[4] || process.env.SUPER_ADMIN_NAME || "سوبر أدمن";

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

async function nextStaffCode(conn) {
  const rows = await conn.query(
    "SELECT `accountCode` FROM `user` WHERE `accountType` = 'STAFF' AND `accountCode` LIKE 'ST-%'",
  );
  let max = 0;
  for (const row of rows) {
    const n = Number(String(row.accountCode).split("-")[1]);
    if (Number.isFinite(n) && n > max) {
      max = n;
    }
  }
  return `ST-${String(max + 1).padStart(6, "0")}`;
}

async function main() {
  if (!SUPER_MOBILE || !SUPER_PASSWORD) {
    throw new Error("usage: node scripts/apply-0028.cjs <mobile> <password>");
  }

  const database = process.env.MYSQL_DATABASE;
  const conn = await mariadb.createConnection({
    host: mysqlHost(),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    database,
    charset: "utf8mb4",
    collation: "utf8mb4_unicode_ci",
    allowPublicKeyRetrieval: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  try {
    if (!(await hasColumn(conn, "user", "isProtected"))) {
      await conn.query("ALTER TABLE `user` ADD COLUMN `isProtected` BOOLEAN NOT NULL DEFAULT false");
    }

    let role = await conn.query("SELECT id FROM `role` WHERE `code` = ?", [SUPER_ROLE]);
    let roleId = role[0]?.id;
    if (!roleId) {
      roleId = crypto.randomUUID();
      await conn.query("INSERT INTO `role` (`id`, `code`, `nameAr`, `nameEn`) VALUES (?, ?, ?, ?)", [
        roleId,
        SUPER_ROLE,
        "سوبر أدمن",
        "Super admin",
      ]);
    }

    const perms = await conn.query("SELECT id FROM `permission`");
    for (const perm of perms) {
      await conn.query("INSERT IGNORE INTO `rolepermission` (`roleId`, `permissionId`) VALUES (?, ?)", [
        roleId,
        perm.id,
      ]);
    }

    const adminTeam = await conn.query("SELECT id FROM `staffteam` WHERE `code` = ?", ["ADMIN-1"]);
    const teamId = adminTeam[0]?.id ?? null;
    const passwordHash = await bcrypt.hash(SUPER_PASSWORD, 12);
    const existing = await conn.query(
      "SELECT id, accountType, displayName FROM `user` WHERE `mobile` = ?",
      [SUPER_MOBILE],
    );

    let userId;
    let displayName = SUPER_NAME;
    if (existing.length) {
      if (existing[0].accountType !== "STAFF") {
        throw new Error(`${SUPER_MOBILE} is ${existing[0].accountType}, not STAFF`);
      }
      userId = existing[0].id;
      displayName = existing[0].displayName || SUPER_NAME;
      await conn.query(
        `UPDATE \`user\`
         SET status = 'ACTIVE', passwordHash = ?, mustChangePassword = 0,
             mobileVerifiedAt = NOW(), lastActiveAt = NOW(), isProtected = 1, updatedAt = NOW()
         WHERE id = ?`,
        [passwordHash, userId],
      );
    } else {
      userId = crypto.randomUUID();
      const accountCode = await nextStaffCode(conn);
      await conn.query(
        `INSERT INTO \`user\`
         (id, accountType, mobile, passwordHash, mustChangePassword, status, displayName, accountCode,
          mobileVerifiedAt, lastActiveAt, termsAcceptedAt, isProtected, createdAt, updatedAt)
         VALUES (?, 'STAFF', ?, ?, 0, 'ACTIVE', ?, ?, NOW(), NOW(), NOW(), 1, NOW(), NOW())`,
        [userId, SUPER_MOBILE, passwordHash, SUPER_NAME, accountCode],
      );
    }

    const staff = await conn.query("SELECT userId FROM `staffuser` WHERE `userId` = ?", [userId]);
    if (staff.length) {
      await conn.query(
        "UPDATE `staffuser` SET `roleId` = ?, `team` = 'ADMIN', `teamId` = ?, `titleAr` = ?, `level` = 9, `customPermissions` = 0 WHERE `userId` = ?",
        [roleId, teamId, "سوبر أدمن", userId],
      );
    } else {
      await conn.query(
        "INSERT INTO `staffuser` (`userId`, `roleId`, `team`, `teamId`, `titleAr`, `level`, `customPermissions`) VALUES (?, ?, 'ADMIN', ?, ?, 9, 0)",
        [userId, roleId, teamId, "سوبر أدمن"],
      );
    }

    console.log(`SUPER_READY staff=${SUPER_MOBILE} name=${displayName} role=${SUPER_ROLE} hidden=1`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
