require("dotenv").config();
const mariadb = require("mariadb");
const crypto = require("crypto");

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

async function upsertDepartment(conn, row) {
  const existing = await conn.query("SELECT id FROM `staffdepartment` WHERE `code` = ?", [row.code]);
  if (existing.length) {
    await conn.query(
      "UPDATE `staffdepartment` SET `nameAr` = ?, `nameEn` = ?, `sortOrder` = ? WHERE `code` = ?",
      [row.nameAr, row.nameEn, row.sortOrder, row.code],
    );
    return existing[0].id;
  }
  const id = crypto.randomUUID();
  await conn.query(
    "INSERT INTO `staffdepartment` (`id`, `code`, `nameAr`, `nameEn`, `sortOrder`, `isActive`) VALUES (?, ?, ?, ?, ?, 1)",
    [id, row.code, row.nameAr, row.nameEn, row.sortOrder],
  );
  return id;
}

async function upsertTeam(conn, row) {
  const existing = await conn.query("SELECT id FROM `staffteam` WHERE `code` = ?", [row.code]);
  if (existing.length) {
    await conn.query(
      "UPDATE `staffteam` SET `departmentId` = ?, `nameAr` = ?, `nameEn` = ?, `sortOrder` = ? WHERE `code` = ?",
      [row.departmentId, row.nameAr, row.nameEn, row.sortOrder, row.code],
    );
    return existing[0].id;
  }
  const id = crypto.randomUUID();
  await conn.query(
    "INSERT INTO `staffteam` (`id`, `departmentId`, `code`, `nameAr`, `nameEn`, `sortOrder`, `isActive`) VALUES (?, ?, ?, ?, ?, ?, 1)",
    [id, row.departmentId, row.code, row.nameAr, row.nameEn, row.sortOrder],
  );
  return id;
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
    if (!(await tableExists(conn, "staffdepartment"))) {
      await conn.query(`
        CREATE TABLE \`staffdepartment\` (
          \`id\` CHAR(36) NOT NULL,
          \`code\` VARCHAR(20) NOT NULL,
          \`nameAr\` VARCHAR(80) NOT NULL,
          \`nameEn\` VARCHAR(80) NOT NULL,
          \`sortOrder\` INT NOT NULL DEFAULT 0,
          \`isActive\` BOOLEAN NOT NULL DEFAULT true,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`StaffDepartment_code_key\` (\`code\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
    if (!(await tableExists(conn, "staffteam"))) {
      await conn.query(`
        CREATE TABLE \`staffteam\` (
          \`id\` CHAR(36) NOT NULL,
          \`departmentId\` CHAR(36) NOT NULL,
          \`code\` VARCHAR(40) NOT NULL,
          \`nameAr\` VARCHAR(120) NOT NULL,
          \`nameEn\` VARCHAR(120) NOT NULL,
          \`sortOrder\` INT NOT NULL DEFAULT 0,
          \`isActive\` BOOLEAN NOT NULL DEFAULT true,
          \`leadUserId\` CHAR(36) NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`StaffTeam_code_key\` (\`code\`),
          KEY \`StaffTeam_departmentId_idx\` (\`departmentId\`),
          CONSTRAINT \`StaffTeam_departmentId_fkey\`
            FOREIGN KEY (\`departmentId\`) REFERENCES \`staffdepartment\`(\`id\`)
            ON DELETE RESTRICT ON UPDATE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
    if (!(await hasColumn(conn, "staffuser", "teamId"))) {
      await conn.query("ALTER TABLE `staffuser` ADD COLUMN `teamId` CHAR(36) NULL");
    }
    if (!(await hasColumn(conn, "staffuser", "titleAr"))) {
      await conn.query("ALTER TABLE `staffuser` ADD COLUMN `titleAr` VARCHAR(80) NULL");
    }
    if (!(await indexExists(conn, "staffuser", "StaffUser_teamId_idx"))) {
      await conn.query("CREATE INDEX `StaffUser_teamId_idx` ON `staffuser`(`teamId`)");
    }

    const opsId = await upsertDepartment(conn, {
      code: "OPS",
      nameAr: "التشغيل",
      nameEn: "Operations",
      sortOrder: 1,
    });
    const financeId = await upsertDepartment(conn, {
      code: "FINANCE",
      nameAr: "المالية",
      nameEn: "Finance",
      sortOrder: 2,
    });
    const adminId = await upsertDepartment(conn, {
      code: "ADMIN",
      nameAr: "الإدارة",
      nameEn: "Administration",
      sortOrder: 3,
    });
    const opsTeam = await upsertTeam(conn, {
      departmentId: opsId,
      code: "OPS-1",
      nameAr: "فريق التشغيل الأول",
      nameEn: "Operations Team 1",
      sortOrder: 1,
    });
    const financeTeam = await upsertTeam(conn, {
      departmentId: financeId,
      code: "FINANCE-1",
      nameAr: "فريق المالية الأول",
      nameEn: "Finance Team 1",
      sortOrder: 1,
    });
    const adminTeam = await upsertTeam(conn, {
      departmentId: adminId,
      code: "ADMIN-1",
      nameAr: "فريق الإدارة",
      nameEn: "Admin Team",
      sortOrder: 1,
    });

    await conn.query("UPDATE `staffuser` SET `teamId` = ? WHERE (`team` = 'OPS' OR `team` IS NULL OR `team` = '') AND `teamId` IS NULL", [
      opsTeam,
    ]);
    await conn.query("UPDATE `staffuser` SET `teamId` = ? WHERE `team` = 'FINANCE' AND `teamId` IS NULL", [financeTeam]);
    await conn.query("UPDATE `staffuser` SET `teamId` = ? WHERE `team` = 'ADMIN' AND `teamId` IS NULL", [adminTeam]);

    if (!(await indexExists(conn, "staffuser", "StaffUser_teamId_fkey"))) {
      try {
        await conn.query(`
          ALTER TABLE \`staffuser\`
          ADD CONSTRAINT \`StaffUser_teamId_fkey\`
          FOREIGN KEY (\`teamId\`) REFERENCES \`staffteam\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE RESTRICT
        `);
      } catch (error) {
        if (!String(error.message || error).includes("Duplicate")) {
          throw error;
        }
      }
    }

    console.log("0016 staff departments and teams applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
