require("dotenv").config();
const mariadb = require("mariadb");

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

async function tableExists(conn, table) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.MYSQL_DATABASE, table],
  );
  return Number(rows[0].n) > 0;
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
    const col = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'staffuser' AND COLUMN_NAME = 'customPermissions'`,
      [process.env.MYSQL_DATABASE],
    );
    if (!Number(col[0].n)) {
      await conn.query(
        "ALTER TABLE `staffuser` ADD COLUMN `customPermissions` BOOLEAN NOT NULL DEFAULT 0",
      );
    }
    if (!(await tableExists(conn, "staffuserpermission"))) {
      await conn.query(`
        CREATE TABLE \`staffuserpermission\` (
          \`userId\` CHAR(36) NOT NULL,
          \`permissionId\` CHAR(36) NOT NULL,
          PRIMARY KEY (\`userId\`, \`permissionId\`),
          CONSTRAINT \`staffuserpermission_userId_fkey\`
            FOREIGN KEY (\`userId\`) REFERENCES \`staffuser\` (\`userId\`)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT \`staffuserpermission_permissionId_fkey\`
            FOREIGN KEY (\`permissionId\`) REFERENCES \`permission\` (\`id\`)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
    console.log("0019 staff user permissions applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
