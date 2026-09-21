const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

async function applySchema() {
  const sqlPath = path.join(process.cwd(), "prisma", "deploy.sql");
  const sql = fs.readFileSync(sqlPath, "utf8").replace(/^\uFEFF/, "");
  const conn = await mariadb.createConnection({
    host: mysqlHost(),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE,
    allowPublicKeyRetrieval: true,
    multipleStatements: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const tables = await conn.query("SHOW TABLES");
    const names = tables.flatMap((row) => Object.values(row)).map((name) => String(name).toLowerCase());
    if (names.includes("user")) {
      return { created: false, message: "tables already exist" };
    }
    await conn.query(sql);
    return { created: true, message: "tables created" };
  } finally {
    await conn.end();
  }
}

module.exports = { applySchema };
