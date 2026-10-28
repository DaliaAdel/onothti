require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");

const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "prisma", "permission-matrix.json"), "utf8"));
const ORG_CODES = ["ACC-10", "ACC-11", "ACC-12", "ACC-13", "ACC-18", "ACC-19", "ACC-20"];
const LEGACY_ROLE = { ADMIN: "AM", OPERATOR: "OE", OPS_LEAD: "OL", FINANCE: "FE" };

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

async function upsertDepartment(conn, row) {
  const existing = await conn.query("SELECT id FROM `staffdepartment` WHERE `code` = ?", [row.code]);
  if (existing.length) {
    await conn.query(
      "UPDATE `staffdepartment` SET `nameAr` = ?, `nameEn` = ?, `sortOrder` = ?, `isActive` = 1 WHERE `code` = ?",
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
      "UPDATE `staffteam` SET `departmentId` = ?, `nameAr` = ?, `nameEn` = ?, `sortOrder` = ?, `isActive` = 1 WHERE `code` = ?",
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

function grantsForRole(roleCode) {
  const mapped = LEGACY_ROLE[roleCode] || roleCode;
  const allowed = new Set();
  for (const perm of matrix.permissions) {
    if (!ORG_CODES.includes(perm.code)) {
      continue;
    }
    if (perm.grants[mapped]) {
      allowed.add(perm.code);
    }
  }
  return allowed;
}

async function main() {
  const database = process.env.MYSQL_DATABASE;
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
    if (!(await tableExists(conn, "staffdepartment")) || !(await tableExists(conn, "staffteam"))) {
      throw new Error("staffdepartment/staffteam missing — run apply-0016 first");
    }

    const opsId = await upsertDepartment(conn, { code: "OPS", nameAr: "التشغيل", nameEn: "Operations", sortOrder: 1 });
    const financeId = await upsertDepartment(conn, { code: "FINANCE", nameAr: "المالية", nameEn: "Finance", sortOrder: 2 });
    const adminId = await upsertDepartment(conn, { code: "ADMIN", nameAr: "الإدارة", nameEn: "Administration", sortOrder: 3 });
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

    if (await tableExists(conn, "staffuser")) {
      await conn.query("UPDATE `staffuser` SET `teamId` = ? WHERE (`team` = 'OPS' OR `team` IS NULL OR `team` = '') AND `teamId` IS NULL", [
        opsTeam,
      ]);
      await conn.query("UPDATE `staffuser` SET `teamId` = ? WHERE `team` = 'FINANCE' AND `teamId` IS NULL", [financeTeam]);
      await conn.query("UPDATE `staffuser` SET `teamId` = ? WHERE `team` = 'ADMIN' AND `teamId` IS NULL", [adminTeam]);
    }

    const permRows = await conn.query(`SELECT id, code FROM \`permission\` WHERE \`code\` IN (${ORG_CODES.map(() => "?").join(",")})`, ORG_CODES);
    const permId = Object.fromEntries(permRows.map((row) => [row.code, row.id]));
    for (const code of ORG_CODES) {
      if (!permId[code]) {
        throw new Error(`missing permission ${code}`);
      }
    }

    const roles = await conn.query("SELECT id, code FROM `role`");
    let roleAdds = 0;
    let roleRemoves = 0;
    for (const role of roles) {
      if (role.code === "SUPER") {
        continue;
      }
      const allowed = grantsForRole(role.code);
      const current = await conn.query(
        `SELECT rp.permissionId, p.code
         FROM \`rolepermission\` rp
         INNER JOIN \`permission\` p ON p.id = rp.permissionId
         WHERE rp.roleId = ? AND p.code IN (${ORG_CODES.map(() => "?").join(",")})`,
        [role.id, ...ORG_CODES],
      );
      const have = new Set(current.map((row) => row.code));
      for (const code of ORG_CODES) {
        if (allowed.has(code) && !have.has(code)) {
          await conn.query("INSERT INTO `rolepermission` (`roleId`, `permissionId`) VALUES (?, ?)", [role.id, permId[code]]);
          roleAdds += 1;
        }
        if (!allowed.has(code) && have.has(code)) {
          await conn.query("DELETE FROM `rolepermission` WHERE `roleId` = ? AND `permissionId` = ?", [role.id, permId[code]]);
          roleRemoves += 1;
        }
      }
    }

    let staffAdds = 0;
    let staffRemoves = 0;
    if (await tableExists(conn, "staffuserpermission")) {
      const staff = await conn.query(
        `SELECT s.userId, r.code AS roleCode
         FROM \`staffuser\` s
         INNER JOIN \`role\` r ON r.id = s.roleId
         WHERE s.customPermissions = 1`,
      );
      for (const row of staff) {
        const allowed = grantsForRole(row.roleCode);
        const current = await conn.query(
          `SELECT sp.permissionId, p.code
           FROM \`staffuserpermission\` sp
           INNER JOIN \`permission\` p ON p.id = sp.permissionId
           WHERE sp.userId = ? AND p.code IN (${ORG_CODES.map(() => "?").join(",")})`,
          [row.userId, ...ORG_CODES],
        );
        const have = new Set(current.map((item) => item.code));
        for (const code of ORG_CODES) {
          if (allowed.has(code) && !have.has(code)) {
            await conn.query("INSERT INTO `staffuserpermission` (`userId`, `permissionId`) VALUES (?, ?)", [
              row.userId,
              permId[code],
            ]);
            staffAdds += 1;
          }
          if (!allowed.has(code) && have.has(code)) {
            await conn.query("DELETE FROM `staffuserpermission` WHERE `userId` = ? AND `permissionId` = ?", [
              row.userId,
              permId[code],
            ]);
            staffRemoves += 1;
          }
        }
      }
    }

    console.log(
      `0027 org permissions applied on ${database} role +${roleAdds}/-${roleRemoves} staff +${staffAdds}/-${staffRemoves}`,
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
