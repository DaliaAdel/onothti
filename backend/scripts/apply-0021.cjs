require("dotenv").config();
const mariadb = require("mariadb");

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

async function tableExists(conn, table) {
  const rows = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.MYSQL_DATABASE, table],
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
    if (!(await tableExists(conn, "packageservice"))) {
      await conn.query(`
        CREATE TABLE \`packageservice\` (
          \`packageId\` CHAR(36) NOT NULL,
          \`serviceId\` CHAR(36) NOT NULL,
          PRIMARY KEY (\`packageId\`, \`serviceId\`),
          KEY \`packageservice_serviceId_idx\` (\`serviceId\`),
          CONSTRAINT \`packageservice_packageId_fkey\`
            FOREIGN KEY (\`packageId\`) REFERENCES \`package\` (\`id\`)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT \`packageservice_serviceId_fkey\`
            FOREIGN KEY (\`serviceId\`) REFERENCES \`service\` (\`id\`)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
    await conn.query(`
      INSERT INTO \`packageservice\` (\`packageId\`, \`serviceId\`)
      SELECT p.\`id\`, s.\`id\`
      FROM \`package\` p
      CROSS JOIN \`service\` s
      WHERE s.\`isVisible\` = 1
        AND NOT EXISTS (
          SELECT 1 FROM \`packageservice\` x
          WHERE x.\`packageId\` = p.\`id\`
        )
    `);
    console.log("0021 package-services applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
