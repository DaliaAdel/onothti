require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");

const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "prisma", "permission-matrix.json"), "utf8"));

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

async function upsertRole(conn, role) {
  const existing = await conn.query("SELECT id FROM `role` WHERE `code` = ?", [role.code]);
  if (existing.length) {
    await conn.query("UPDATE `role` SET `nameAr` = ?, `nameEn` = ? WHERE `code` = ?", [
      role.nameAr,
      role.nameEn,
      role.code,
    ]);
    return existing[0].id;
  }
  const id = crypto.randomUUID();
  await conn.query("INSERT INTO `role` (`id`, `code`, `nameAr`, `nameEn`) VALUES (?, ?, ?, ?)", [
    id,
    role.code,
    role.nameAr,
    role.nameEn,
  ]);
  return id;
}

async function upsertPermission(conn, row, sortOrder) {
  const existing = await conn.query("SELECT id FROM `permission` WHERE `code` = ?", [row.code]);
  if (existing.length) {
    await conn.query(
      "UPDATE `permission` SET `nameAr` = ?, `nameEn` = ?, `groupAr` = ?, `sortOrder` = ? WHERE `code` = ?",
      [row.nameAr, row.code, row.groupAr, sortOrder, row.code],
    );
    return existing[0].id;
  }
  const id = crypto.randomUUID();
  await conn.query(
    "INSERT INTO `permission` (`id`, `code`, `nameAr`, `nameEn`, `groupAr`, `sortOrder`) VALUES (?, ?, ?, ?, ?, ?)",
    [id, row.code, row.nameAr, row.code, row.groupAr, sortOrder],
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
    if (!(await columnExists(conn, "permission", "groupAr"))) {
      await conn.query("ALTER TABLE `permission` ADD COLUMN `groupAr` VARCHAR(80) NOT NULL DEFAULT '' AFTER `nameEn`");
    }
    if (!(await columnExists(conn, "permission", "sortOrder"))) {
      await conn.query("ALTER TABLE `permission` ADD COLUMN `sortOrder` INT NOT NULL DEFAULT 0 AFTER `groupAr`");
    }
    await conn.query("ALTER TABLE `permission` MODIFY `nameAr` VARCHAR(200) NOT NULL");

    const roleIds = {};
    for (const role of matrix.roles) {
      roleIds[role.code] = await upsertRole(conn, role);
    }

    const permissionIds = {};
    for (const [index, perm] of matrix.permissions.entries()) {
      permissionIds[perm.code] = await upsertPermission(conn, perm, index + 1);
    }

    const excelCodes = matrix.permissions.map((row) => row.code);
    for (const role of matrix.roles) {
      const roleId = roleIds[role.code];
      const existing = await conn.query(
        `SELECT COUNT(*) AS n
         FROM \`rolepermission\` rp
         INNER JOIN \`permission\` p ON p.\`id\` = rp.\`permissionId\`
         WHERE rp.\`roleId\` = ? AND p.\`code\` IN (${excelCodes.map(() => "?").join(",")})`,
        [roleId, ...excelCodes],
      );
      if (Number(existing[0].n) > 0) {
        continue;
      }
      for (const perm of matrix.permissions) {
        if (!perm.grants[role.code]) {
          continue;
        }
        await conn.query("INSERT INTO `rolepermission` (`roleId`, `permissionId`) VALUES (?, ?)", [
          roleId,
          permissionIds[perm.code],
        ]);
      }
    }

    console.log("0022 staff permission matrix applied");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
