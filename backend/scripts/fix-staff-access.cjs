require("dotenv").config();
const { randomUUID } = require("crypto");
const mariadb = require("mariadb");

const STAFF_MOBILES = ["0500000002", "0500000003"];

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

async function upsertByCode(conn, table, row, columns) {
  const existing = await conn.query(`SELECT id FROM \`${table}\` WHERE \`code\` = ?`, [row.code]);
  if (existing.length) {
    return existing[0].id;
  }
  const id = randomUUID();
  const keys = ["id", ...columns];
  const placeholders = keys.map(() => "?").join(", ");
  await conn.query(
    `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${placeholders})`,
    [id, ...columns.map((k) => row[k])],
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
          UNIQUE KEY \`StaffTeam_code_key\` (\`code\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
    if (!(await hasColumn(conn, "staffuser", "teamId"))) {
      await conn.query("ALTER TABLE `staffuser` ADD COLUMN `teamId` CHAR(36) NULL");
    }
    if (!(await hasColumn(conn, "staffuser", "titleAr"))) {
      await conn.query("ALTER TABLE `staffuser` ADD COLUMN `titleAr` VARCHAR(80) NULL");
    }
    if (!(await hasColumn(conn, "staffuser", "customPermissions"))) {
      await conn.query(
        "ALTER TABLE `staffuser` ADD COLUMN `customPermissions` BOOLEAN NOT NULL DEFAULT 0",
      );
    }
    if (!(await tableExists(conn, "staffuserpermission"))) {
      await conn.query(`
        CREATE TABLE \`staffuserpermission\` (
          \`userId\` CHAR(36) NOT NULL,
          \`permissionId\` CHAR(36) NOT NULL,
          PRIMARY KEY (\`userId\`, \`permissionId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    const opsDept = await upsertByCode(
      conn,
      "staffdepartment",
      { code: "OPS", nameAr: "التشغيل", nameEn: "Operations", sortOrder: 1, isActive: 1 },
      ["code", "nameAr", "nameEn", "sortOrder", "isActive"],
    );
    const financeDept = await upsertByCode(
      conn,
      "staffdepartment",
      { code: "FINANCE", nameAr: "المالية", nameEn: "Finance", sortOrder: 2, isActive: 1 },
      ["code", "nameAr", "nameEn", "sortOrder", "isActive"],
    );
    const opsTeam = await upsertByCode(
      conn,
      "staffteam",
      {
        departmentId: opsDept,
        code: "OPS-1",
        nameAr: "فريق التشغيل الأول",
        nameEn: "Operations Team 1",
        sortOrder: 1,
        isActive: 1,
      },
      ["departmentId", "code", "nameAr", "nameEn", "sortOrder", "isActive"],
    );
    const financeTeam = await upsertByCode(
      conn,
      "staffteam",
      {
        departmentId: financeDept,
        code: "FINANCE-1",
        nameAr: "فريق المالية الأول",
        nameEn: "Finance Team 1",
        sortOrder: 1,
        isActive: 1,
      },
      ["departmentId", "code", "nameAr", "nameEn", "sortOrder", "isActive"],
    );

    const users = await conn.query(
      `SELECT u.id, u.mobile, u.displayName, u.accountType, s.userId AS staffId, s.roleId, r.code AS roleCode
       FROM \`user\` u
       LEFT JOIN \`staffuser\` s ON s.userId = u.id
       LEFT JOIN \`role\` r ON r.id = s.roleId
       WHERE u.mobile IN (?, ?)`,
      STAFF_MOBILES,
    );

    for (const user of users) {
      console.log(
        `user ${user.mobile} type=${user.accountType} staff=${user.staffId ? "yes" : "NO"} role=${user.roleCode || "-"}`,
      );
      if (!user.staffId || !user.roleId) {
        console.log(`SKIP ${user.mobile}: no staff row`);
        continue;
      }
      const teamId = user.roleCode === "FM" || user.roleCode === "FINANCE" ? financeTeam : opsTeam;
      await conn.query(
        "UPDATE `staffuser` SET `teamId` = COALESCE(`teamId`, ?), `customPermissions` = 0 WHERE `userId` = ?",
        [teamId, user.id],
      );
      await conn.query("DELETE FROM `staffuserpermission` WHERE `userId` = ?", [user.id]);
      const copied = await conn.query(
        `INSERT IGNORE INTO \`staffuserpermission\` (\`userId\`, \`permissionId\`)
         SELECT ?, rp.\`permissionId\` FROM \`rolepermission\` rp WHERE rp.\`roleId\` = ?`,
        [user.id, user.roleId],
      );
      const roleCount = await conn.query(
        "SELECT COUNT(*) AS n FROM `rolepermission` WHERE `roleId` = ?",
        [user.roleId],
      );
      const grantCount = await conn.query(
        "SELECT COUNT(*) AS n FROM `staffuserpermission` WHERE `userId` = ?",
        [user.id],
      );
      console.log(
        `${user.mobile} copied=${copied.affectedRows || 0} rolePerms=${Number(roleCount[0].n)} userPerms=${Number(grantCount[0].n)}`,
      );
    }

    console.log("STAFF_ACCESS_OK");
    console.log("NEXT: rebuild backend and restart API");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
