require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");

const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "prisma", "permission-matrix.json"), "utf8"));
const ORG_CODES = ["ACC-10", "ACC-11", "ACC-12", "ACC-13", "ACC-18", "ACC-19", "ACC-20"];
const LEGACY_ROLE = { ADMIN: "AM", OPERATOR: "OE", OPS_LEAD: "OL", FINANCE: "FE" };
const MATRIX_ROLES = matrix.roles.map((row) => row.code);

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

function grantsForRole(roleCode) {
  const mapped = LEGACY_ROLE[roleCode] || roleCode;
  const allowed = [];
  for (const perm of matrix.permissions) {
    if (ORG_CODES.includes(perm.code) && perm.grants[mapped]) {
      allowed.push(perm.code);
    }
  }
  return allowed;
}

function ok(pass, label, detail) {
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark}  ${label}${detail ? " — " + detail : ""}`);
  return pass;
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
  });

  let failed = 0;
  console.log(`DB ${database} @ ${mysqlHost()}:${process.env.MYSQL_PORT || 3306}`);
  console.log("no API / no frontend\n");

  try {
    const ping = await conn.query("SELECT DATABASE() AS db, 1 AS ok");
    if (!ok(ping[0]?.db === database, "connected", ping[0]?.db)) failed += 1;

    const counts = Object.fromEntries(
      (
        await conn.query(`
          SELECT 'user' t, COUNT(*) n FROM \`user\`
          UNION ALL SELECT 'staffuser', COUNT(*) FROM \`staffuser\`
          UNION ALL SELECT 'staffdepartment', COUNT(*) FROM \`staffdepartment\`
          UNION ALL SELECT 'staffteam', COUNT(*) FROM \`staffteam\`
          UNION ALL SELECT 'role', COUNT(*) FROM \`role\`
          UNION ALL SELECT 'permission', COUNT(*) FROM \`permission\`
          UNION ALL SELECT 'rolepermission', COUNT(*) FROM \`rolepermission\`
        `)
      ).map((row) => [row.t, Number(row.n)]),
    );
    console.log(
      `counts  users=${counts.user} staff=${counts.staffuser} depts=${counts.staffdepartment} teams=${counts.staffteam} roles=${counts.role} perms=${counts.permission}`,
    );

    const depts = await conn.query("SELECT code, nameAr FROM `staffdepartment` ORDER BY sortOrder, code");
    const deptCodes = depts.map((row) => row.code).sort().join(",");
    if (!ok(deptCodes === "ADMIN,FINANCE,OPS", "departments", depts.map((row) => `${row.code}:${row.nameAr}`).join(" | "))) {
      failed += 1;
    }

    const teams = await conn.query(
      `SELECT t.code, t.nameAr, d.code AS dept
       FROM \`staffteam\` t
       INNER JOIN \`staffdepartment\` d ON d.id = t.departmentId
       ORDER BY t.code`,
    );
    const teamCodes = teams.map((row) => row.code).sort().join(",");
    if (!ok(teamCodes === "ADMIN-1,FINANCE-1,OPS-1", "default teams", teams.map((row) => `${row.code}@${row.dept}`).join(" | "))) {
      failed += 1;
    }
    const orphanTeams = await conn.query(
      `SELECT t.code FROM \`staffteam\` t
       LEFT JOIN \`staffdepartment\` d ON d.id = t.departmentId
       WHERE d.id IS NULL`,
    );
    if (!ok(orphanTeams.length === 0, "teams linked to departments")) failed += 1;

    const roles = await conn.query("SELECT code FROM `role`");
    const roleCodes = roles.map((row) => row.code);
    const missingRoles = MATRIX_ROLES.filter((code) => !roleCodes.includes(code));
    if (!ok(missingRoles.length === 0, "excel roles exist", missingRoles.join(",") || "AM OM FM AL OL FL AE OE FE")) {
      failed += 1;
    }

    const missingPerms = [];
    for (const code of ORG_CODES) {
      const rows = await conn.query("SELECT id FROM `permission` WHERE `code` = ?", [code]);
      if (!rows.length) missingPerms.push(code);
    }
    if (!ok(missingPerms.length === 0, "org permission rows", missingPerms.join(",") || ORG_CODES.join(","))) {
      failed += 1;
    }

    for (const role of roles) {
      if (role.code === "SUPER") {
        continue;
      }
      const expected = grantsForRole(role.code).sort();
      const actualRows = await conn.query(
        `SELECT p.code
         FROM \`rolepermission\` rp
         INNER JOIN \`permission\` p ON p.id = rp.permissionId
         WHERE rp.roleId = (SELECT id FROM \`role\` WHERE code = ?)
           AND p.code IN (${ORG_CODES.map(() => "?").join(",")})
         ORDER BY p.code`,
        [role.code, ...ORG_CODES],
      );
      const actual = actualRows.map((row) => row.code);
      const same = JSON.stringify(actual) === JSON.stringify(expected);
      if (!ok(same, `grants ${role.code}`, `got ${actual.join(",") || "none"} expected ${expected.join(",") || "none"}`)) {
        failed += 1;
      }
    }

    if (counts.staffuser > 0) {
      const unassigned = await conn.query("SELECT COUNT(*) AS n FROM `staffuser` WHERE `teamId` IS NULL");
      if (!ok(Number(unassigned[0].n) === 0, "staff assigned to a team", `${unassigned[0].n} without team`)) {
        failed += 1;
      }
      const leaked = await conn.query(
        `SELECT u.displayName, r.code AS roleCode, p.code
         FROM \`staffuserpermission\` sp
         INNER JOIN \`user\` u ON u.id = sp.userId
         INNER JOIN \`staffuser\` s ON s.userId = u.id
         INNER JOIN \`role\` r ON r.id = s.roleId
         INNER JOIN \`permission\` p ON p.id = sp.permissionId
         WHERE s.customPermissions = 1 AND p.code IN (${ORG_CODES.map(() => "?").join(",")})`,
        ORG_CODES,
      );
      let leakCount = 0;
      for (const row of leaked) {
        const allowed = grantsForRole(row.roleCode);
        if (!allowed.includes(row.code)) {
          leakCount += 1;
          ok(false, `staff leak ${row.displayName}/${row.roleCode}`, row.code);
        }
      }
      if (leakCount === 0) ok(true, "custom staff org grants match excel");
      else failed += leakCount;
    } else {
      ok(true, "no staff accounts to check (empty dump)");
    }

    console.log("");
    if (counts.user === 0) {
      console.log("NOTE  no users in this database — login tests need accounts copied or created later");
    }
    if (failed) {
      console.log(`RESULT  ${failed} failed`);
      process.exitCode = 1;
    } else {
      console.log("RESULT  all org checks passed");
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("FAIL  " + err.message);
  process.exit(1);
});
