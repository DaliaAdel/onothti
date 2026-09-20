const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const database = process.env.MYSQL_DATABASE || "OnothitiDB";
if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error("Invalid MYSQL_DATABASE name");
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  console.log(`Database ${database} is ready`);
  await connection.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
