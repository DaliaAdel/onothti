require("dotenv").config();
const mariadb = require("mariadb");
const crypto = require("crypto");

function mysqlHost() {
  const host = process.env.MYSQL_HOST || "localhost";
  return host === "localhost" ? "127.0.0.1" : host;
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
    await conn.query("ALTER TABLE `legalpage` MODIFY `code` VARCHAR(80) NOT NULL");

    if (!(await hasColumn(conn, "legalpage", "audience"))) {
      await conn.query("ALTER TABLE `legalpage` ADD COLUMN `audience` VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'");
    }
    if (!(await hasColumn(conn, "legalpage", "kind"))) {
      await conn.query("ALTER TABLE `legalpage` ADD COLUMN `kind` VARCHAR(20) NOT NULL DEFAULT 'TERMS'");
    }
    if (!(await hasColumn(conn, "legalpage", "isActive"))) {
      await conn.query("ALTER TABLE `legalpage` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true");
    }

    await conn.query(
      "UPDATE `legalpage` SET `audience` = 'PROVIDER' WHERE `code` LIKE '%\\_PROVIDER' AND (`audience` IS NULL OR `audience` = '' OR `audience` = 'CUSTOMER')",
    );
    await conn.query(
      "UPDATE `legalpage` SET `audience` = 'STAFF' WHERE `code` LIKE '%\\_STAFF'",
    );
    await conn.query("UPDATE `legalpage` SET `kind` = 'POLICIES' WHERE `code` LIKE 'POLICIES%'");
    await conn.query("UPDATE `legalpage` SET `kind` = 'PRIVACY' WHERE `code` LIKE 'PRIVACY%'");
    await conn.query("UPDATE `legalpage` SET `kind` = 'TERMS' WHERE `code` LIKE 'TERMS%'");

    if (!(await indexExists(conn, "legalpage", "LegalPage_kind_audience_isActive_idx"))) {
      await conn.query(
        "CREATE INDEX `LegalPage_kind_audience_isActive_idx` ON `legalpage`(`kind`, `audience`, `isActive`)",
      );
    }

    const staffPages = [
      {
        code: "TERMS_STAFF",
        kind: "TERMS",
        titleAr: "الشروط والأحكام — موظفو المنصة",
        bodyAr: [
          "استخدام لوحة التشغيل يخضع لهذه الشروط وصلاحيات الدور المعين لكِ.",
          "لا تشاركي بيانات الدخول أو رمز التحقق، والحساب شخصي غير قابل للنقل.",
          "الاطلاع على بيانات العميلات والخبيرات للتشغيل والدعم فقط، وليس للاستخدام خارج المنصة.",
          "أي إجراء على الحسابات أو المحتوى يُسجّل في سجل التدقيق.",
        ].join("\n\n"),
      },
      {
        code: "POLICIES_STAFF",
        kind: "POLICIES",
        titleAr: "السياسات — موظفو المنصة",
        bodyAr: [
          "بيانات التشغيل والحسابات سرية، ولا تُنسخ أو تُشارك خارج مهام الدور.",
          "صلاحياتكِ تحدد الصفحات والإجراءات المتاحة. لا تطلبي تجاوز الصلاحية من زميلة.",
          "المحتوى والمرفقات تُراجع وفق السياسات المعتمدة، ويُوثّق القرار عند الرفض أو الإخفاء.",
        ].join("\n\n"),
      },
    ];
    for (const page of staffPages) {
      const existing = await conn.query("SELECT id FROM `legalpage` WHERE `code` = ?", [page.code]);
      if (!existing.length) {
        await conn.query(
          "INSERT INTO `legalpage` (`id`, `code`, `audience`, `kind`, `titleAr`, `titleEn`, `bodyAr`, `bodyEn`, `version`, `isActive`) VALUES (?, ?, 'STAFF', ?, ?, '', ?, '', 1, 1)",
          [crypto.randomUUID(), page.code, page.kind, page.titleAr, page.bodyAr],
        );
      }
    }

    console.log("0013 legal audience/kind/isActive applied");
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
