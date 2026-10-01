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

async function indexExists(conn, table, indexName) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [process.env.MYSQL_DATABASE, table, indexName],
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

async function addColumn(conn, table, column, ddl) {
  if (await columnExists(conn, table, column)) {
    return;
  }
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
}

async function main() {
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
    await addColumn(conn, "user", "termsAcceptedAt", "`termsAcceptedAt` DATETIME(0) NULL");
    await addColumn(conn, "user", "termsVersion", "`termsVersion` INTEGER NULL");
    if (!(await indexExists(conn, "user", "user_email_key"))) {
      await conn.query("CREATE UNIQUE INDEX `user_email_key` ON `user`(`email`)");
    }
    if (!(await indexExists(conn, "user", "user_accountType_displayName_idx"))) {
      await conn.query(
        "CREATE INDEX `user_accountType_displayName_idx` ON `user`(`accountType`, `displayName`)",
      );
    }

    await addColumn(conn, "session", "deviceId", "`deviceId` VARCHAR(80) NULL");
    await addColumn(conn, "session", "channel", "`channel` VARCHAR(10) NOT NULL DEFAULT 'WEB'");
    await addColumn(conn, "session", "revokedAt", "`revokedAt` DATETIME(0) NULL");
    if (!(await indexExists(conn, "session", "session_userId_deviceId_channel_idx"))) {
      await conn.query(
        "CREATE INDEX `session_userId_deviceId_channel_idx` ON `session`(`userId`, `deviceId`, `channel`)",
      );
    }

    await addColumn(conn, "providerprofile", "lastAppearedAt", "`lastAppearedAt` DATETIME(0) NULL");
    await addColumn(conn, "providerservice", "isPrimary", "`isPrimary` BOOLEAN NOT NULL DEFAULT false");
    await addColumn(conn, "providerservice", "priceFrom", "`priceFrom` DECIMAL(10, 2) NULL");
    await addColumn(conn, "providerservice", "priceTo", "`priceTo` DECIMAL(10, 2) NULL");

    await addColumn(conn, "notification", "type", "`type` VARCHAR(40) NOT NULL DEFAULT 'SYSTEM'");
    await addColumn(conn, "notification", "ref", "`ref` VARCHAR(80) NULL");
    await addColumn(conn, "notification", "readAt", "`readAt` DATETIME(0) NULL");
    if (!(await indexExists(conn, "notification", "notification_userId_createdAt_idx"))) {
      await conn.query(
        "CREATE INDEX `notification_userId_createdAt_idx` ON `notification`(`userId`, `createdAt`)",
      );
    }

    if (!(await tableExists(conn, "coveragearea"))) {
      await conn.query(`CREATE TABLE \`coveragearea\` (
        \`id\` CHAR(36) NOT NULL,
        \`cityId\` CHAR(36) NOT NULL,
        \`code\` VARCHAR(40) NOT NULL,
        \`nameAr\` VARCHAR(120) NOT NULL,
        \`nameEn\` VARCHAR(120) NOT NULL,
        \`isVisible\` BOOLEAN NOT NULL DEFAULT true,
        UNIQUE INDEX \`coveragearea_code_key\`(\`code\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }
    if (!(await tableExists(conn, "providercoverage"))) {
      await conn.query(`CREATE TABLE \`providercoverage\` (
        \`providerUserId\` CHAR(36) NOT NULL,
        \`coverageAreaId\` CHAR(36) NOT NULL,
        PRIMARY KEY (\`providerUserId\`, \`coverageAreaId\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }
    if (!(await tableExists(conn, "profilechangerequest"))) {
      await conn.query(`CREATE TABLE \`profilechangerequest\` (
        \`id\` CHAR(36) NOT NULL,
        \`userId\` CHAR(36) NOT NULL,
        \`field\` VARCHAR(40) NOT NULL,
        \`oldValue\` LONGTEXT NULL,
        \`newValue\` LONGTEXT NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
        \`reviewedAt\` DATETIME(0) NULL,
        INDEX \`profilechangerequest_userId_status_idx\`(\`userId\`, \`status\`),
        INDEX \`profilechangerequest_field_status_idx\`(\`field\`, \`status\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }
    if (!(await tableExists(conn, "welcomemessage"))) {
      await conn.query(`CREATE TABLE \`welcomemessage\` (
        \`id\` CHAR(36) NOT NULL,
        \`audience\` VARCHAR(20) NOT NULL,
        \`kind\` VARCHAR(20) NOT NULL,
        \`bodyAr\` VARCHAR(400) NOT NULL,
        \`bodyEn\` VARCHAR(400) NOT NULL DEFAULT '',
        \`isActive\` BOOLEAN NOT NULL DEFAULT true,
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }

    const fks = [
      [
        "coveragearea",
        "coveragearea_cityId_fkey",
        "ALTER TABLE `coveragearea` ADD CONSTRAINT `coveragearea_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `city`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT",
      ],
      [
        "providercoverage",
        "providercoverage_coverageAreaId_fkey",
        "ALTER TABLE `providercoverage` ADD CONSTRAINT `providercoverage_coverageAreaId_fkey` FOREIGN KEY (`coverageAreaId`) REFERENCES `coveragearea`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
      ],
      [
        "providercoverage",
        "providercoverage_providerUserId_fkey",
        "ALTER TABLE `providercoverage` ADD CONSTRAINT `providercoverage_providerUserId_fkey` FOREIGN KEY (`providerUserId`) REFERENCES `providerprofile`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE",
      ],
      [
        "profilechangerequest",
        "profilechangerequest_userId_fkey",
        "ALTER TABLE `profilechangerequest` ADD CONSTRAINT `profilechangerequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
      ],
    ];
    for (const [table, name, ddl] of fks) {
      if (await constraintExists(conn, table, name)) continue;
      await conn.query(ddl);
    }

    console.log("0003 sow alignment applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
