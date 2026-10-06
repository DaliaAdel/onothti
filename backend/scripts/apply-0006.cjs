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

async function indexExists(conn, table, name) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
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
    if (!(await columnExists(conn, "region", "isVisible"))) {
      await conn.query("ALTER TABLE `region` ADD COLUMN `isVisible` BOOLEAN NOT NULL DEFAULT true");
    }
    if (!(await columnExists(conn, "region", "sortOrder"))) {
      await conn.query("ALTER TABLE `region` ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0");
    }
    if (!(await indexExists(conn, "region", "region_isVisible_sortOrder_idx"))) {
      await conn.query("CREATE INDEX `region_isVisible_sortOrder_idx` ON `region`(`isVisible`, `sortOrder`)");
    }
    if (!(await indexExists(conn, "city", "city_regionId_isVisible_idx"))) {
      await conn.query("CREATE INDEX `city_regionId_isVisible_idx` ON `city`(`regionId`, `isVisible`)");
    }

    if (!(await tableExists(conn, "customercity"))) {
      await conn.query(`CREATE TABLE \`customercity\` (
        \`customerUserId\` CHAR(36) NOT NULL,
        \`cityId\` CHAR(36) NOT NULL,
        \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
        INDEX \`customercity_cityId_idx\`(\`cityId\`),
        PRIMARY KEY (\`customerUserId\`, \`cityId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }
    if (!(await tableExists(conn, "providercity"))) {
      await conn.query(`CREATE TABLE \`providercity\` (
        \`providerUserId\` CHAR(36) NOT NULL,
        \`cityId\` CHAR(36) NOT NULL,
        \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
        INDEX \`providercity_cityId_idx\`(\`cityId\`),
        PRIMARY KEY (\`providerUserId\`, \`cityId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }
    if (!(await constraintExists(conn, "customercity", "customercity_customerUserId_fkey"))) {
      await conn.query(
        "ALTER TABLE `customercity` ADD CONSTRAINT `customercity_customerUserId_fkey` FOREIGN KEY (`customerUserId`) REFERENCES `customerprofile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE",
      );
    }
    if (!(await constraintExists(conn, "customercity", "customercity_cityId_fkey"))) {
      await conn.query(
        "ALTER TABLE `customercity` ADD CONSTRAINT `customercity_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT",
      );
    }
    if (!(await constraintExists(conn, "providercity", "providercity_providerUserId_fkey"))) {
      await conn.query(
        "ALTER TABLE `providercity` ADD CONSTRAINT `providercity_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `providerprofile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE",
      );
    }
    if (!(await constraintExists(conn, "providercity", "providercity_cityId_fkey"))) {
      await conn.query(
        "ALTER TABLE `providercity` ADD CONSTRAINT `providercity_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT",
      );
    }

    await conn.query(`
      INSERT IGNORE INTO \`customercity\` (\`customerUserId\`, \`cityId\`, \`sortOrder\`)
      SELECT \`userId\`, \`cityId\`, 0 FROM \`customerprofile\` WHERE \`cityId\` IS NOT NULL
    `);
    await conn.query(`
      INSERT IGNORE INTO \`providercity\` (\`providerUserId\`, \`cityId\`, \`sortOrder\`)
      SELECT \`userId\`, \`cityId\`, 0 FROM \`providerprofile\` WHERE \`cityId\` IS NOT NULL
    `);
    console.log("0006 regions and user cities applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
