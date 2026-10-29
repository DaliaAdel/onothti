require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");

const matrix = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "prisma", "permission-matrix.json"), "utf8"));
const EXTRA_BY_ROLE = {
  AM: ["LEGAL_MANAGE", "SETTINGS_MANAGE"],
};

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

function allowedFor(roleCode) {
  const allowed = new Set(EXTRA_BY_ROLE[roleCode] ?? []);
  for (const perm of matrix.permissions) {
    if (perm.grants[roleCode]) {
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
    const permRows = await conn.query("SELECT id, code FROM `permission`");
    const permId = Object.fromEntries(permRows.map((row) => [row.code, row.id]));
    const roles = await conn.query("SELECT id, code FROM `role`");
    let added = 0;
    let removed = 0;

    for (const role of roles) {
      if (role.code === "SUPER") {
        for (const row of permRows) {
          const result = await conn.query(
            "INSERT IGNORE INTO `rolepermission` (`roleId`, `permissionId`) VALUES (?, ?)",
            [role.id, row.id],
          );
          added += Number(result.affectedRows || 0);
        }
        continue;
      }
      if (!matrix.roles.some((item) => item.code === role.code)) {
        continue;
      }
      const allowed = allowedFor(role.code);
      const current = await conn.query(
        `SELECT rp.permissionId, p.code
         FROM \`rolepermission\` rp
         INNER JOIN \`permission\` p ON p.id = rp.permissionId
         WHERE rp.roleId = ?`,
        [role.id],
      );
      const have = new Set(current.map((row) => row.code));
      for (const row of current) {
        if (!allowed.has(row.code)) {
          await conn.query("DELETE FROM `rolepermission` WHERE `roleId` = ? AND `permissionId` = ?", [
            role.id,
            row.permissionId,
          ]);
          removed += 1;
        }
      }
      for (const code of allowed) {
        const id = permId[code];
        if (!id || have.has(code)) {
          continue;
        }
        await conn.query("INSERT INTO `rolepermission` (`roleId`, `permissionId`) VALUES (?, ?)", [role.id, id]);
        added += 1;
      }
    }

    console.log(`0031 role permissions synced on ${database} +${added}/-${removed}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
