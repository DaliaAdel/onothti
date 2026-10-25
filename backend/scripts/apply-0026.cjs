require("dotenv").config();
const mariadb = require("mariadb");

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

async function columnExists(conn, table, column) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.MYSQL_DATABASE, table, column],
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
    if (!(await columnExists(conn, "package", "isPromotional"))) {
      await conn.query("ALTER TABLE `package` ADD COLUMN `isPromotional` BOOLEAN NOT NULL DEFAULT false");
      console.log("added package.isPromotional");
    }
    const fromCampaign = await conn.query(
      "UPDATE `package` p INNER JOIN `campaign` c ON c.packageId = p.id SET p.isPromotional = true",
    );
    const fromName = await conn.query("UPDATE `package` SET isPromotional = true WHERE `nameAr` LIKE ?", [
      "%الوطن%",
    ]);
    console.log("promo from campaigns", Number(fromCampaign.affectedRows || 0));
    console.log("promo from national day", Number(fromName.affectedRows || 0));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
