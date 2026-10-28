require("dotenv").config();
const crypto = require("crypto");
const mariadb = require("mariadb");

const TYPES = [
  { code: "CU-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "CUSTOMER" },
  { code: "CU-SUGGEST", nameAr: "مقترحات", nameEn: "Suggestions", audience: "CUSTOMER" },
  { code: "BM-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "PROVIDER" },
  { code: "BM-SUGGEST", nameAr: "مقترحات", nameEn: "Suggestions", audience: "PROVIDER" },
  { code: "OP-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "STAFF" },
  { code: "OP-SUGGEST", nameAr: "مقترحات", nameEn: "Suggestions", audience: "STAFF" },
];
const KEEP = TYPES.map((row) => row.code);
const SUPPORT = { CUSTOMER: "CU-SUPPORT", PROVIDER: "BM-SUPPORT", STAFF: "OP-SUPPORT" };
const SUGGEST = { CUSTOMER: "CU-SUGGEST", PROVIDER: "BM-SUGGEST", STAFF: "OP-SUGGEST" };

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

async function applyToDatabase(database) {
  const conn = await mariadb.createConnection({
    host: mysqlHost(),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    database,
    charset: "utf8mb4",
    collation: "utf8mb4_unicode_ci",
    allowPublicKeyRetrieval: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const keepIds = {};
    for (const type of TYPES) {
      const existing = await conn.query("SELECT id FROM `tickettype` WHERE `code` = ?", [type.code]);
      if (existing.length) {
        await conn.query(
          "UPDATE `tickettype` SET `nameAr` = ?, `nameEn` = ?, `audience` = ? WHERE `code` = ?",
          [type.nameAr, type.nameEn, type.audience, type.code],
        );
        keepIds[type.code] = existing[0].id;
      } else {
        const id = crypto.randomUUID();
        await conn.query(
          "INSERT INTO `tickettype` (`id`, `code`, `nameAr`, `nameEn`, `audience`) VALUES (?, ?, ?, ?, ?)",
          [id, type.code, type.nameAr, type.nameEn, type.audience],
        );
        keepIds[type.code] = id;
      }
    }

    const extras = await conn.query(
      "SELECT id, audience, nameAr, code FROM `tickettype` WHERE `code` NOT IN (" + KEEP.map(() => "?").join(",") + ")",
      KEEP,
    );
    let moved = 0;
    let removed = 0;
    for (const extra of extras) {
      const fallbackCode =
        extra.nameAr === "مقترحات"
          ? SUGGEST[extra.audience] || "OP-SUGGEST"
          : SUPPORT[extra.audience] || "OP-SUPPORT";
      const fallbackId = keepIds[fallbackCode];
      if (fallbackId) {
        const result = await conn.query("UPDATE `ticket` SET `typeId` = ? WHERE `typeId` = ?", [fallbackId, extra.id]);
        moved += Number(result.affectedRows || 0);
      }
      await conn.query("DELETE FROM `tickettype` WHERE `id` = ?", [extra.id]);
      removed += 1;
    }
    const left = await conn.query("SELECT audience, code, nameAr FROM `tickettype` ORDER BY audience, code");
    console.log(`0030 ${database} removed=${removed} movedTickets=${moved}`);
    for (const row of left) {
      console.log(`  ${row.audience} ${row.code} ${row.nameAr}`);
    }
  } finally {
    await conn.end();
  }
}

async function main() {
  const root = await mariadb.createConnection({
    host: mysqlHost(),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    charset: "utf8mb4",
    allowPublicKeyRetrieval: true,
  });
  const names = [];
  try {
    const dbs = await root.query("SHOW DATABASES");
    for (const row of dbs) {
      const name = String(Object.values(row)[0]);
      const tables = await root.query(
        `SELECT COUNT(*) AS n FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tickettype'`,
        [name],
      );
      if (Number(tables[0].n)) {
        names.push(name);
      }
    }
  } finally {
    await root.end();
  }
  if (!names.length && process.env.MYSQL_DATABASE) {
    names.push(process.env.MYSQL_DATABASE);
  }
  for (const database of names) {
    await applyToDatabase(database);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
