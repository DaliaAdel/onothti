require("dotenv").config();
const mariadb = require("mariadb");

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
    allowPublicKeyRetrieval: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const rows = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.MYSQL_DATABASE, "providerservice", "isActive"],
    );
    if (Number(rows[0].n) === 0) {
      await conn.query(
        "ALTER TABLE `providerservice` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true",
      );
    }
    console.log("0004 provider service isActive applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
