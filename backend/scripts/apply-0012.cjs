require("dotenv").config();
const mariadb = require("mariadb");
const crypto = require("crypto");

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

const PERMS = [
  { code: "BROADCAST_ALL", nameAr: "إشعار جماعي خبيرة وعميلة", nameEn: "Broadcast to providers and customers" },
  { code: "BROADCAST_PROVIDER", nameAr: "إشعار جماعي خبيرة فقط", nameEn: "Broadcast to providers only" },
  { code: "BROADCAST_CUSTOMER", nameAr: "إشعار جماعي عميلة فقط", nameEn: "Broadcast to customers only" },
  { code: "NOTIFY_PROVIDER", nameAr: "إشعار فردي خبيرة", nameEn: "Notify a provider" },
  { code: "NOTIFY_CUSTOMER", nameAr: "إشعار فردي عميلة", nameEn: "Notify a customer" },
];

async function main() {
  const conn = await mariadb.createConnection({
    host: mysqlHost(),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE,
    allowPublicKeyRetrieval: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  try {
    for (const perm of PERMS) {
      const rows = await conn.query("SELECT id FROM `permission` WHERE `code` = ?", [perm.code]);
      if (!rows.length) {
        await conn.query(
          "INSERT INTO `permission` (`id`, `code`, `nameAr`, `nameEn`) VALUES (?, ?, ?, ?)",
          [crypto.randomUUID(), perm.code, perm.nameAr, perm.nameEn],
        );
      } else {
        await conn.query("UPDATE `permission` SET `nameAr` = ?, `nameEn` = ? WHERE `code` = ?", [
          perm.nameAr,
          perm.nameEn,
          perm.code,
        ]);
      }
    }

    const admin = await conn.query("SELECT id FROM `role` WHERE `code` = 'ADMIN' LIMIT 1");
    if (admin.length) {
      const roleId = admin[0].id;
      const perms = await conn.query("SELECT id, `code` FROM `permission` WHERE `code` IN (?, ?, ?, ?, ?)", PERMS.map((p) => p.code));
      for (const perm of perms) {
        const existing = await conn.query(
          "SELECT 1 FROM `rolepermission` WHERE `roleId` = ? AND `permissionId` = ?",
          [roleId, perm.id],
        );
        if (!existing.length) {
          await conn.query("INSERT INTO `rolepermission` (`roleId`, `permissionId`) VALUES (?, ?)", [roleId, perm.id]);
        }
      }
    }

    console.log("0012 notify permissions applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
