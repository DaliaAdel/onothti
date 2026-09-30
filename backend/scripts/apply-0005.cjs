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

async function tableExists(conn, table) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.MYSQL_DATABASE, table],
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
    allowPublicKeyRetrieval: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  try {
    if (!(await columnExists(conn, "package", "maxAlbums"))) {
      await conn.query("ALTER TABLE `package` ADD COLUMN `maxAlbums` INTEGER NULL");
    }
    await conn.query(`
      UPDATE \`package\` SET \`maxAlbums\` = CASE \`code\`
        WHEN 'FREE' THEN 5
        WHEN 'GREEN' THEN 1
        WHEN 'BRONZE' THEN 2
        WHEN 'SILVER' THEN 3
        WHEN 'GOLD' THEN 5
        ELSE 1
      END
      WHERE \`maxAlbums\` IS NULL
    `);
    if (!(await tableExists(conn, "portfolioalbum"))) {
      await conn.query(`CREATE TABLE \`portfolioalbum\` (
        \`id\` CHAR(36) NOT NULL,
        \`providerUserId\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(120) NOT NULL,
        \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
        \`isActive\` BOOLEAN NOT NULL DEFAULT true,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
        INDEX \`portfolioalbum_providerUserId_sortOrder_idx\`(\`providerUserId\`, \`sortOrder\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }
    if (!(await columnExists(conn, "portfolioitem", "albumId"))) {
      await conn.query("ALTER TABLE `portfolioitem` ADD COLUMN `albumId` CHAR(36) NULL");
    }
    if (!(await constraintExists(conn, "portfolioalbum", "portfolioalbum_providerUserId_fkey"))) {
      await conn.query(
        "ALTER TABLE `portfolioalbum` ADD CONSTRAINT `portfolioalbum_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `providerprofile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE",
      );
    }
    if (!(await constraintExists(conn, "portfolioitem", "portfolioitem_albumId_fkey"))) {
      await conn.query(
        "ALTER TABLE `portfolioitem` ADD CONSTRAINT `portfolioitem_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `portfolioalbum`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
      );
    }
    console.log("0005 portfolio albums applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
