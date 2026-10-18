require("dotenv").config();
const mariadb = require("mariadb");

const LEGACY_TO_MATRIX = {
  USERS_MANAGE: [
    "ACC-01", "ACC-02", "ACC-03", "ACC-04", "ACC-05", "ACC-06", "ACC-07", "ACC-08", "ACC-09",
    "ACC-10", "ACC-11", "ACC-12", "ACC-13", "ACC-14", "ACC-15", "ACC-16", "ACC-18", "ACC-19", "ACC-20",
    "USR-04",
  ],
  CUSTOMERS_REVIEW: ["PRO-01"],
  RATINGS_REVIEW: ["PRO-02", "PRO-05", "PRO-07", "PRO-10", "RAT-01", "RAT-02", "RAT-03"],
  MEDIA_REVIEW: ["PRO-03", "PRO-06", "PRO-08", "PRO-09"],
  PROVIDERS_APPROVE: ["PRO-05", "PRO-06", "PRO-07"],
  ACCOUNTS_ACTION: ["USR-01", "USR-05", "USR-06"],
  PACKAGES_MANAGE: ["PKG-01", "PKG-03", "PKG-04", "PKG-05"],
  ESCALATE_FINANCE: ["PKG-02"],
  PAYMENTS_REVIEW: ["FIN-01", "FIN-02", "FIN-06"],
  PAYMENTS_CONFIRM: ["FIN-03", "FIN-04", "FIN-05"],
  TICKETS_MANAGE: ["TKT-01", "TKT-02", "TKT-03"],
  NOTIFY_PROVIDER: ["NOT-01"],
  NOTIFY_CUSTOMER: ["NOT-01"],
  BROADCAST_ALL: ["NOT-02"],
  BROADCAST_CUSTOMER: ["NOT-03"],
  BROADCAST_PROVIDER: ["NOT-04"],
  REPORTS_VIEW: ["REP-01", "REP-02", "REP-03", "REP-04", "REP-05", "REP-06"],
  SETTINGS_MANAGE: ["RAT-05"],
  CATALOG_MANAGE: ["CAT-01"],
  GEO_MANAGE: ["CAT-02"],
};

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

async function permissionId(conn, code) {
  const rows = await conn.query("SELECT id FROM `permission` WHERE `code` = ?", [code]);
  return rows[0]?.id ?? null;
}

async function grantIfMissing(conn, table, ownerCol, ownerId, permissionId) {
  const existing = await conn.query(
    `SELECT ${ownerCol} FROM \`${table}\` WHERE \`${ownerCol}\` = ? AND \`permissionId\` = ?`,
    [ownerId, permissionId],
  );
  if (existing.length) {
    return false;
  }
  await conn.query(`INSERT INTO \`${table}\` (\`${ownerCol}\`, \`permissionId\`) VALUES (?, ?)`, [
    ownerId,
    permissionId,
  ]);
  return true;
}

async function grantFromLegacy(conn, table, ownerCol, fromId, toId) {
  const owners = await conn.query(`SELECT DISTINCT \`${ownerCol}\` AS id FROM \`${table}\` WHERE \`permissionId\` = ?`, [
    fromId,
  ]);
  let added = 0;
  for (const row of owners) {
    if (await grantIfMissing(conn, table, ownerCol, row.id, toId)) {
      added += 1;
    }
  }
  return added;
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
    let roleAdds = 0;
    let staffAdds = 0;
    for (const [legacy, matrixCodes] of Object.entries(LEGACY_TO_MATRIX)) {
      const legacyId = await permissionId(conn, legacy);
      if (!legacyId) {
        continue;
      }
      for (const matrix of matrixCodes) {
        const matrixId = await permissionId(conn, matrix);
        if (!matrixId) {
          throw new Error(`missing permission ${matrix}`);
        }
        roleAdds += await grantFromLegacy(conn, "rolepermission", "roleId", legacyId, matrixId);
        staffAdds += await grantFromLegacy(conn, "staffuserpermission", "userId", legacyId, matrixId);
      }
    }
    console.log(`0024 matrix grants mirrored roles=${roleAdds} staff=${staffAdds}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
