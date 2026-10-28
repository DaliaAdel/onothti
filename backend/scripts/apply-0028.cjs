require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mariadb = require("mariadb");

const SUPER_ROLE = "SUPER";
const SUPER_MOBILE = process.env.SUPER_ADMIN_MOBILE || "0500000099";
const SUPER_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "Onothiti1";
const SUPER_NAME = "حساب النظام";
const SUPER_CODE = "ST-000000";

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

async function main() {
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
      console.log("added user.isProtected");
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
    const existing = await conn.query("SELECT id, accountType, isProtected FROM `user` WHERE `mobile` = ?", [
      SUPER_MOBILE,
    ]);
    let userId;
    if (existing.length) {
      if (existing[0].accountType !== "STAFF") {
        throw new Error(`${SUPER_MOBILE} already used by ${existing[0].accountType}`);
      }
      userId = existing[0].id;
      await conn.query(
        `UPDATE \`user\`
         SET displayName = ?, status = 'ACTIVE', passwordHash = ?, mustChangePassword = 0,
             mobileVerifiedAt = NOW(), isProtected = 1, updatedAt = NOW()
         WHERE id = ?`,
        [SUPER_NAME, passwordHash, userId],
      );
    } else {
      const codeTaken = await conn.query("SELECT id FROM `user` WHERE `accountCode` = ?", [SUPER_CODE]);
      const accountCode = codeTaken.length ? `ST-${crypto.randomUUID().slice(0, 8)}` : SUPER_CODE;
      userId = crypto.randomUUID();
      await conn.query(
        `INSERT INTO \`user\`
         (id, accountType, mobile, passwordHash, mustChangePassword, status, displayName, accountCode,
          mobileVerifiedAt, termsAcceptedAt, isProtected, createdAt, updatedAt)
         VALUES (?, 'STAFF', ?, ?, 0, 'ACTIVE', ?, ?, NOW(), NOW(), 1, NOW(), NOW())`,
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

    console.log(`0028 protected super admin ready on ${database}: ${SUPER_MOBILE}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
