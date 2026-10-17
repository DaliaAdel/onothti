require("dotenv").config();
const mariadb = require("mariadb");
const crypto = require("crypto");

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

async function upsertPermission(conn, row) {
  const existing = await conn.query("SELECT id FROM `permission` WHERE `code` = ?", [row.code]);
  if (existing.length) {
    await conn.query("UPDATE `permission` SET `nameAr` = ?, `nameEn` = ? WHERE `code` = ?", [
      row.nameAr,
      row.nameEn,
      row.code,
    ]);
    return existing[0].id;
  }
  const id = crypto.randomUUID();
  await conn.query("INSERT INTO `permission` (`id`, `code`, `nameAr`, `nameEn`) VALUES (?, ?, ?, ?)", [
    id,
    row.code,
    row.nameAr,
    row.nameEn,
  ]);
  return id;
}

async function grantRoles(conn, roleCodes, permissionId) {
  for (const code of roleCodes) {
    const roles = await conn.query("SELECT id FROM `role` WHERE `code` = ?", [code]);
    if (!roles.length) {
      continue;
    }
    const existing = await conn.query(
      "SELECT roleId FROM `rolepermission` WHERE `roleId` = ? AND `permissionId` = ?",
      [roles[0].id, permissionId],
    );
    if (existing.length) {
      continue;
    }
    await conn.query("INSERT INTO `rolepermission` (`roleId`, `permissionId`) VALUES (?, ?)", [
      roles[0].id,
      permissionId,
    ]);
  }
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
    const permissionId = await upsertPermission(conn, {
      code: "ACCOUNTS_ACTION",
      nameAr: "إجراء الحساب",
      nameEn: "Account actions",
    });
    await grantRoles(conn, ["OPERATOR", "OPS_LEAD", "ADMIN"], permissionId);
    await conn.query(
      `INSERT INTO \`staffuserpermission\` (\`userId\`, \`permissionId\`)
       SELECT DISTINCT sp.\`userId\`, ?
       FROM \`staffuserpermission\` sp
       INNER JOIN \`permission\` p ON p.\`id\` = sp.\`permissionId\`
       WHERE p.\`code\` IN ('CUSTOMERS_REVIEW', 'PROVIDERS_APPROVE')
         AND NOT EXISTS (
           SELECT 1 FROM \`staffuserpermission\` x
           WHERE x.\`userId\` = sp.\`userId\` AND x.\`permissionId\` = ?
         )`,
      [permissionId, permissionId],
    );
    console.log("0020 accounts-action permission applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
