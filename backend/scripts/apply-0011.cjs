require("dotenv").config();
const mariadb = require("mariadb");

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

async function upsertSetting(conn, key, value) {
  const rows = await conn.query("SELECT `value` FROM `setting` WHERE `key` = ?", [key]);
  if (!rows.length) {
    await conn.query("INSERT INTO `setting` (`key`, `value`) VALUES (?, ?)", [key, value]);
  }
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
    if (!(await hasColumn(conn, "customerprofile", "bio"))) {
      await conn.query("ALTER TABLE `customerprofile` ADD COLUMN `bio` LONGTEXT NULL");
    }
    await conn.query("ALTER TABLE `rating` MODIFY `note` VARCHAR(500) NULL");

    const idleDaysRows = await conn.query("SELECT `value` FROM `setting` WHERE `key` = ?", ["idle_after_days"]);
    const idleDays = idleDaysRows[0]?.value || "90";
    await upsertSetting(conn, "idle_customer", `${idleDays} day`);
    await upsertSetting(conn, "idle_provider", `${idleDays} day`);
    await upsertSetting(conn, "provider_bio_max", "1000");
    await upsertSetting(conn, "customer_bio_max", "300");

    const ratingRows = await conn.query("SELECT `value` FROM `setting` WHERE `key` = ?", ["rating_note_max"]);
    if (!ratingRows.length) {
      await upsertSetting(conn, "rating_note_max", "300");
    } else if (String(ratingRows[0].value) === "100") {
      await conn.query("UPDATE `setting` SET `value` = '300' WHERE `key` = 'rating_note_max'");
    }

    console.log("0011 idle/bio/rating limits applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
