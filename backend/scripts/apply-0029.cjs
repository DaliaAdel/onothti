require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");

const geo = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "prisma", "saudi-geo.json"), "utf8"));

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
}

function normRegion(name) {
  return String(name || "")
    .replace(/^المنطقة\s+/, "")
    .replace(/^منطقة\s+/, "")
    .replace(/^منطقه\s+/, "")
    .trim();
}

async function applyToDatabase(database) {
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

  const stats = { regionsCreated: 0, regionsUpdated: 0, citiesCreated: 0, citiesUpdated: 0 };
  try {
    const existingRegions = await conn.query("SELECT id, code, nameAr FROM `region`");
    const regionIdByCode = new Map();
    const regionIdByName = new Map();
    for (const row of existingRegions) {
      regionIdByCode.set(row.code, row.id);
      regionIdByName.set(row.nameAr, row.id);
      regionIdByName.set(normRegion(row.nameAr), row.id);
    }

    const regionIds = {};
    for (const region of geo.regions) {
      const existingId =
        regionIdByCode.get(region.code) ||
        regionIdByName.get(region.nameAr) ||
        regionIdByName.get(normRegion(region.nameAr));
      if (existingId) {
        await conn.query(
          "UPDATE `region` SET `code` = ?, `nameAr` = ?, `nameEn` = ?, `isVisible` = 1, `sortOrder` = ? WHERE `id` = ?",
          [region.code, region.nameAr, region.nameEn, region.sortOrder, existingId],
        );
        regionIds[region.code] = existingId;
        stats.regionsUpdated += 1;
      } else {
        const id = crypto.randomUUID();
        await conn.query(
          "INSERT INTO `region` (`id`, `code`, `nameAr`, `nameEn`, `isVisible`, `sortOrder`) VALUES (?, ?, ?, ?, 1, ?)",
          [id, region.code, region.nameAr, region.nameEn, region.sortOrder],
        );
        regionIds[region.code] = id;
        stats.regionsCreated += 1;
      }
      regionIdByCode.set(region.code, regionIds[region.code]);
      regionIdByName.set(region.nameAr, regionIds[region.code]);
      regionIdByName.set(normRegion(region.nameAr), regionIds[region.code]);
    }

    const existingCities = await conn.query("SELECT id, code, nameAr, regionId FROM `city`");
    const cityIdByCode = new Map();
    const cityIdByName = new Map();
    for (const row of existingCities) {
      cityIdByCode.set(row.code, row.id);
      cityIdByName.set(row.nameAr, row.id);
    }

    const seenCityNames = new Set();
    for (const city of geo.cities) {
      if (seenCityNames.has(city.nameAr)) {
        continue;
      }
      seenCityNames.add(city.nameAr);
      const regionId = regionIds[city.region];
      if (!regionId) {
        throw new Error(`Missing region ${city.region} for city ${city.nameAr}`);
      }
      const existingId = cityIdByCode.get(city.code) || cityIdByName.get(city.nameAr);
      if (existingId) {
        await conn.query(
          "UPDATE `city` SET `code` = ?, `nameAr` = ?, `nameEn` = ?, `regionId` = ?, `isVisible` = 1 WHERE `id` = ?",
          [city.code, city.nameAr, city.nameEn, regionId, existingId],
        );
        stats.citiesUpdated += 1;
        cityIdByCode.set(city.code, existingId);
        cityIdByName.set(city.nameAr, existingId);
      } else {
        const id = crypto.randomUUID();
        await conn.query(
          "INSERT INTO `city` (`id`, `regionId`, `code`, `nameAr`, `nameEn`, `isVisible`) VALUES (?, ?, ?, ?, ?, 1)",
          [id, regionId, city.code, city.nameAr, city.nameEn],
        );
        stats.citiesCreated += 1;
        cityIdByCode.set(city.code, id);
        cityIdByName.set(city.nameAr, id);
      }
    }

    const keepCodes = geo.regions.map((region) => region.code);
    const extras = await conn.query(
      "SELECT id, code, nameAr FROM `region` WHERE `code` NOT IN (" + keepCodes.map(() => "?").join(",") + ")",
      keepCodes,
    );
    for (const extra of extras) {
      const cities = await conn.query(
        "SELECT COUNT(*) AS n FROM `city` WHERE `regionId` = ? AND `isVisible` = 1",
        [extra.id],
      );
      if (Number(cities[0].n) === 0) {
        await conn.query("UPDATE `region` SET `isVisible` = 0 WHERE `id` = ?", [extra.id]);
        console.log(`hid unused region ${extra.nameAr} (${extra.code})`);
      }
    }

    const counts = await conn.query(
      `SELECT r.nameAr AS region, COUNT(c.id) AS cities
       FROM \`region\` r
       LEFT JOIN \`city\` c ON c.regionId = r.id AND c.isVisible = 1
       WHERE r.isVisible = 1
       GROUP BY r.id, r.nameAr, r.sortOrder
       ORDER BY r.sortOrder, r.nameAr`,
    );
    console.log(`0029 ${database}`, stats);
    for (const row of counts) {
      console.log(`  ${row.region}: ${Number(row.cities)} cities`);
    }
  } finally {
    await conn.end();
  }
}

async function listGeoDatabases() {
  const conn = await mariadb.createConnection({
    host: mysqlHost(),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    charset: "utf8mb4",
    allowPublicKeyRetrieval: true,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const rows = await conn.query("SHOW DATABASES");
    const names = rows.map((row) => String(Object.values(row)[0]));
    const found = [];
    for (const name of names) {
      const tables = await conn.query(
        `SELECT COUNT(*) AS n FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'region'`,
        [name],
      );
      if (Number(tables[0].n)) {
        found.push(name);
      }
    }
    return found;
  } finally {
    await conn.end();
  }
}

async function main() {
  const databases = await listGeoDatabases();
  if (!databases.length && process.env.MYSQL_DATABASE) {
    databases.push(process.env.MYSQL_DATABASE);
  }
  for (const database of databases) {
    await applyToDatabase(database);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
