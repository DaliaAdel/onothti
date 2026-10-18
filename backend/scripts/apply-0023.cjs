require("dotenv").config();
const mariadb = require("mariadb");

const PAIRS = [
  { matrix: "CAT-01", legacy: "CATALOG_MANAGE" },
  { matrix: "CAT-02", legacy: "GEO_MANAGE" },
];

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

async function mirror(conn, table, ownerCol, fromId, toId) {
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
    for (const pair of PAIRS) {
      const matrixId = await permissionId(conn, pair.matrix);
      const legacyId = await permissionId(conn, pair.legacy);
      if (!matrixId || !legacyId) {
        throw new Error(`missing permission ${pair.matrix} / ${pair.legacy}`);
      }
      roleAdds += await mirror(conn, "rolepermission", "roleId", legacyId, matrixId);
      roleAdds += await mirror(conn, "rolepermission", "roleId", matrixId, legacyId);
      staffAdds += await mirror(conn, "staffuserpermission", "userId", legacyId, matrixId);
      staffAdds += await mirror(conn, "staffuserpermission", "userId", matrixId, legacyId);
    }
    console.log(`0023 catalog/geo aliases mirrored roles=${roleAdds} staff=${staffAdds}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
