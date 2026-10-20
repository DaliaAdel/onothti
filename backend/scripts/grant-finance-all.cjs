require("dotenv").config();
const mariadb = require("mariadb");

const MOBILE = "0500000003";

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
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
    const users = await conn.query(
      `SELECT u.id, u.displayName, s.roleId, r.code AS roleCode
       FROM \`user\` u
       INNER JOIN \`staffuser\` s ON s.userId = u.id
       INNER JOIN \`role\` r ON r.id = s.roleId
       WHERE u.mobile = ? AND u.accountType = 'STAFF'
       LIMIT 1`,
      [MOBILE],
    );
    if (!users.length) {
      throw new Error(`لا يوجد حساب مشغل على ${MOBILE}`);
    }
    const user = users[0];
    const perms = await conn.query("SELECT id, code FROM `permission`");
    if (!perms.length) {
      throw new Error("جدول الصلاحيات فاضي");
    }

    await conn.query("UPDATE `staffuser` SET `customPermissions` = 1 WHERE `userId` = ?", [user.id]);
    await conn.query("DELETE FROM `staffuserpermission` WHERE `userId` = ?", [user.id]);
    for (const perm of perms) {
      await conn.query(
        "INSERT IGNORE INTO `staffuserpermission` (`userId`, `permissionId`) VALUES (?, ?)",
        [user.id, perm.id],
      );
    }
    for (const perm of perms) {
      await conn.query(
        "INSERT IGNORE INTO `rolepermission` (`roleId`, `permissionId`) VALUES (?, ?)",
        [user.roleId, perm.id],
      );
    }

    const granted = await conn.query(
      "SELECT COUNT(*) AS n FROM `staffuserpermission` WHERE `userId` = ?",
      [user.id],
    );
    console.log(
      `FINANCE_ALL_OK ${user.displayName} ${MOBILE} role=${user.roleCode} perms=${Number(granted[0].n)}/${perms.length}`,
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
