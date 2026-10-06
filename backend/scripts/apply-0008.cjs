require("dotenv").config();
const { randomUUID } = require("crypto");
const mariadb = require("mariadb");

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

const extraPermissions = [
  { code: "CATALOG_MANAGE", nameAr: "إدارة الخدمات", nameEn: "Manage catalog services" },
];

const grants = {
  OPERATOR: ["CATALOG_MANAGE"],
  OPS_LEAD: ["CATALOG_MANAGE"],
  ADMIN: extraPermissions.map((item) => item.code),
};

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
  });
  try {
    for (const item of extraPermissions) {
      const existing = await conn.query("SELECT id FROM permission WHERE code = ?", [item.code]);
      if (!existing[0]) {
        await conn.query("INSERT INTO permission (id, code, nameAr, nameEn) VALUES (?, ?, ?, ?)", [
          randomUUID(),
          item.code,
          item.nameAr,
          item.nameEn,
        ]);
      } else {
        await conn.query("UPDATE permission SET nameAr = ?, nameEn = ? WHERE code = ?", [
          item.nameAr,
          item.nameEn,
          item.code,
        ]);
      }
    }
    const roles = await conn.query("SELECT id, code FROM role");
    const perms = await conn.query("SELECT id, code FROM permission");
    const roleId = Object.fromEntries(roles.map((row) => [row.code, row.id]));
    const permId = Object.fromEntries(perms.map((row) => [row.code, row.id]));
    for (const [roleCode, codes] of Object.entries(grants)) {
      for (const code of codes) {
        if (!roleId[roleCode] || !permId[code]) {
          continue;
        }
        await conn.query("INSERT IGNORE INTO rolepermission (roleId, permissionId) VALUES (?, ?)", [
          roleId[roleCode],
          permId[code],
        ]);
      }
    }
    if (roleId.ADMIN) {
      for (const permission of perms) {
        await conn.query("INSERT IGNORE INTO rolepermission (roleId, permissionId) VALUES (?, ?)", [
          roleId.ADMIN,
          permission.id,
        ]);
      }
    }
    console.log("catalog permission updated");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
