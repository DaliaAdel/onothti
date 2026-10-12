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

async function indexExists(conn, table, name) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [process.env.MYSQL_DATABASE, table, name],
  );
  return Number(rows[0].n) > 0;
}

async function constraintExists(conn, table, name) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [process.env.MYSQL_DATABASE, table, name],
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
    if (!(await hasColumn(conn, "package", "priceBefore"))) {
      await conn.query("ALTER TABLE `package` ADD COLUMN `priceBefore` DECIMAL(10,2) NOT NULL DEFAULT 0");
      await conn.query("UPDATE `package` SET `priceBefore` = `price`");
    }
    if (!(await hasColumn(conn, "package", "discountPercent"))) {
      await conn.query("ALTER TABLE `package` ADD COLUMN `discountPercent` DECIMAL(5,2) NOT NULL DEFAULT 0");
    }

    if (!(await hasColumn(conn, "campaign", "packageId"))) {
      await conn.query("ALTER TABLE `campaign` ADD COLUMN `packageId` CHAR(36) NULL");
    }

    const free = await conn.query("SELECT id FROM `package` WHERE `code` = 'FREE' LIMIT 1");
    const anyPkg = await conn.query("SELECT id FROM `package` ORDER BY `rank` ASC LIMIT 1");
    const fallbackId = free[0]?.id || anyPkg[0]?.id;
    if (fallbackId) {
      await conn.query("UPDATE `campaign` SET `packageId` = ? WHERE `packageId` IS NULL OR `packageId` = ''", [
        fallbackId,
      ]);
    }

    const dangling = await conn.query("SELECT COUNT(*) AS n FROM `campaign` WHERE `packageId` IS NULL OR `packageId` = ''");
    if (Number(dangling[0].n) > 0) {
      throw new Error("campaign.packageId still empty; add a package first");
    }

    await conn.query("ALTER TABLE `campaign` MODIFY `packageId` CHAR(36) NOT NULL");

    if (!(await indexExists(conn, "campaign", "Campaign_packageId_isActive_startDate_idx"))) {
      await conn.query(
        "CREATE INDEX `Campaign_packageId_isActive_startDate_idx` ON `campaign`(`packageId`, `isActive`, `startDate`)",
      );
    }
    if (!(await constraintExists(conn, "campaign", "campaign_packageId_fkey"))) {
      await conn.query(
        "ALTER TABLE `campaign` ADD CONSTRAINT `campaign_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `package`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT",
      );
    }

    console.log("0014 package discount + campaign package link applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
