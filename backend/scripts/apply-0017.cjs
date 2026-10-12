require("dotenv").config();
const mariadb = require("mariadb");
const crypto = require("crypto");

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

async function upsertType(conn, row) {
  const existing = await conn.query("SELECT id FROM `tickettype` WHERE `code` = ?", [row.code]);
  if (existing.length) {
    await conn.query("UPDATE `tickettype` SET `nameAr` = ?, `nameEn` = ?, `audience` = ? WHERE `code` = ?", [
      row.nameAr,
      row.nameEn,
      row.audience,
      row.code,
    ]);
    return;
  }
  await conn.query(
    "INSERT INTO `tickettype` (`id`, `code`, `nameAr`, `nameEn`, `audience`) VALUES (?, ?, ?, ?, ?)",
    [crypto.randomUUID(), row.code, row.nameAr, row.nameEn, row.audience],
  );
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
    if (!(await hasColumn(conn, "ticket", "title"))) {
      await conn.query("ALTER TABLE `ticket` ADD COLUMN `title` VARCHAR(160) NULL");
    }

    const types = [
      { code: "CU-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "CUSTOMER" },
      { code: "BM-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "PROVIDER" },
      { code: "OP-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "STAFF" },
      { code: "OP-SUGGEST", nameAr: "مقترحات", nameEn: "Suggestions", audience: "STAFF" },
    ];
    for (const type of types) {
      await upsertType(conn, type);
    }
    await conn.query("UPDATE `tickettype` SET `nameAr` = 'مقترحات', `nameEn` = 'Suggestions' WHERE `code` IN ('CU-08', 'BM-13')");

    console.log("0017 ticket title + support/suggestion types applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
