import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const jsonHeader = [{ key: "Content-Type", value: "application/json" }];

function bearer(tokenVar) {
  return {
    type: "bearer",
    bearer: [{ key: "token", value: `{{${tokenVar}}}`, type: "string" }],
  };
}

function saveToken(tokenVar, extras = []) {
  return [
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "if (pm.response.code >= 400) return;",
          "const json = pm.response.json();",
          "if (!json.accessToken) return;",
          `pm.collectionVariables.set('${tokenVar}', json.accessToken);`,
          "if (pm.environment) {",
          `  pm.environment.set('${tokenVar}', json.accessToken);`,
          "}",
          ...extras,
        ],
      },
    },
  ];
}

function saveJson(lines) {
  return [
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: ["if (pm.response.code >= 400) return;", "const json = pm.response.json();", ...lines],
      },
    },
  ];
}

function req(name, method, path, opts = {}) {
  const { token, body, formdata, desc, query, event, noauth } = opts;
  const queryPairs = query
    ? Object.entries(query).map(([key, value]) => ({ key, value: String(value) }))
    : [];
  const raw =
    queryPairs.length > 0
      ? `{{baseUrl}}/api${path}?${queryPairs.map((row) => `${row.key}=${row.value}`).join("&")}`
      : `{{baseUrl}}/api${path}`;
  const request = {
    method,
    header: body ? jsonHeader : [],
    url: queryPairs.length
      ? {
          raw,
          host: ["{{baseUrl}}"],
          path: ["api", ...path.replace(/^\//, "").split("/")],
          query: queryPairs,
        }
      : raw,
    description: desc || "",
  };
  if (noauth) request.auth = { type: "noauth" };
  else if (token) request.auth = bearer(token);
  if (body) {
    request.body = {
      mode: "raw",
      raw: typeof body === "string" ? body : JSON.stringify(body, null, 2),
    };
  }
  if (formdata) {
    request.body = { mode: "formdata", formdata };
  }
  const item = { name, request };
  if (event) item.event = event;
  return item;
}

function folder(name, items, token) {
  const out = { name, item: items };
  if (token) out.auth = bearer(token);
  if (token === null) out.auth = { type: "noauth" };
  return out;
}

const collection = {
  info: {
    name: "أنوثتي API — Customer · Provider · Staff",
    description: [
      "Collection كاملة لحسابات العميلة والخبيرة وStaff.",
      "",
      "السيرفر: {{baseUrl}}  (افتراضي http://localhost:3000)",
      "Swagger: http://localhost:3000/docs",
      "OTP التطوير: 123456  (OTP_DEV_CODE — لا يُستخدم في production)",
      "",
      "الدخول:",
      "- عميلة وخبيرة: جوال + OTP فقط. POST /auth/phone/start ثم /auth/phone/verify",
      "- Staff فقط: جوال + كلمة مرور عبر POST /auth/login",
      "",
      "حسابات تجريبية بعد الـ seed:",
      "- عميلة: سارة / 0504444444",
      "- خبيرة: نورة 0501111111 | هند 0502222222 | منى 0503333333",
      "- Staff: 0500000001 — عيّني staffPassword من STAFF_PASSWORD وقت الـ seed",
      "",
      "الترتيب:",
      "1) Catalog → المدن والخدمات (يحفظ cityId / serviceId)",
      "2) Auth → OTP للعميلة/الخبيرة أو كلمة مرور للـ Staff (يحفظ التوكن)",
      "3) شغّلي طلبات المجلد المناسب",
    ].join("\n"),
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:3000" },
    { key: "customerMobile", value: "0504444444" },
    { key: "providerMobile", value: "0501111111" },
    { key: "staffMobile", value: "0500000001" },
    { key: "staffPassword", value: "Secret123" },
    { key: "otp", value: "123456" },
    { key: "customerToken", value: "" },
    { key: "providerToken", value: "" },
    { key: "staffToken", value: "" },
    { key: "cityId", value: "" },
    { key: "regionId", value: "" },
    { key: "serviceId", value: "" },
    { key: "subServiceId", value: "" },
    { key: "coverageAreaId", value: "" },
    { key: "providerId", value: "" },
    { key: "packageId", value: "" },
    { key: "providerServiceId", value: "" },
    { key: "albumId", value: "" },
    { key: "portfolioId", value: "" },
    { key: "ticketId", value: "" },
    { key: "accountId", value: "" },
    { key: "staffId", value: "" },
    { key: "roleId", value: "" },
    { key: "departmentId", value: "" },
    { key: "mediaId", value: "" },
    { key: "notificationId", value: "" },
  ],
  item: [
    folder(
      "0. عام — Catalog & Content",
      [
        req("GET /health", "GET", "/health", {
          noauth: true,
          desc: "فحص السيرفر وقاعدة البيانات",
        }),
        req("GET /catalog/regions", "GET", "/catalog/regions", {
          noauth: true,
          event: saveJson([
            "const first = Array.isArray(json) ? json[0] : null;",
            "if (first?.id) pm.collectionVariables.set('regionId', first.id);",
            "const city = first?.cities?.[0];",
            "if (city?.id) pm.collectionVariables.set('cityId', city.id);",
            "const area = city?.coverageAreas?.[0];",
            "if (area?.id) pm.collectionVariables.set('coverageAreaId', area.id);",
          ]),
        }),
        req("GET /catalog/cities", "GET", "/catalog/cities", {
          noauth: true,
          event: saveJson([
            "const riyadh = (json || []).find((c) => c.code === 'RIYADH') || json?.[0];",
            "if (riyadh?.id) pm.collectionVariables.set('cityId', riyadh.id);",
            "if (riyadh?.region?.id) pm.collectionVariables.set('regionId', riyadh.region.id);",
            "const area = riyadh?.coverageAreas?.[0];",
            "if (area?.id) pm.collectionVariables.set('coverageAreaId', area.id);",
          ]),
        }),
        req("GET /catalog/services", "GET", "/catalog/services", {
          noauth: true,
          event: saveJson([
            "const first = json?.[0];",
            "if (first?.id) pm.collectionVariables.set('serviceId', first.id);",
            "if (first?.subServices?.[0]?.id) pm.collectionVariables.set('subServiceId', first.subServices[0].id);",
          ]),
        }),
        req("GET /catalog/packages", "GET", "/catalog/packages", {
          noauth: true,
          event: saveJson([
            "const first = json?.[0];",
            "if (first?.id) pm.collectionVariables.set('packageId', first.id);",
          ]),
        }),
        req("GET /catalog/campaign", "GET", "/catalog/campaign", { noauth: true }),
        req("GET /catalog/settings", "GET", "/catalog/settings", { noauth: true }),
        req("GET /search", "GET", "/search", {
          noauth: true,
          query: { cityId: "{{cityId}}", serviceId: "{{serviceId}}", page: "1", pageSize: "20" },
          event: saveJson([
            "const first = json?.items?.[0] || json?.[0];",
            "const id = first?.id || first?.userId || first?.providerId;",
            "if (id) pm.collectionVariables.set('providerId', id);",
          ]),
        }),
        req("GET /providers/:id", "GET", "/providers/{{providerId}}", { noauth: true }),
        req("POST /providers/:id/whatsapp", "POST", "/providers/{{providerId}}/whatsapp", {
          noauth: true,
        }),
        req("GET /settings/about", "GET", "/settings/about", { noauth: true }),
        req("GET /legal/terms", "GET", "/legal/terms", {
          noauth: true,
          query: { audience: "CUSTOMER" },
        }),
        req("GET /legal/policies", "GET", "/legal/policies", {
          noauth: true,
          query: { audience: "PROVIDER" },
        }),
        req("GET /legal/privacy", "GET", "/legal/privacy", {
          noauth: true,
          query: { audience: "STAFF" },
        }),
        req("GET /content/welcome", "GET", "/content/welcome", {
          noauth: true,
          query: { audience: "CUSTOMER" },
        }),
      ],
      null,
    ),

    folder(
      "1. Auth — دخول لكل نوع",
      [
        req("عميلة — 1 إرسال OTP", "POST", "/auth/phone/start", {
          noauth: true,
          body: { mobile: "{{customerMobile}}", channel: "WEB" },
          desc: "العميلة تدخل بالجوال فقط. يرسل OTP. في التطوير الرمز {{otp}}.",
        }),
        req("عميلة — 2 تحقق OTP", "POST", "/auth/phone/verify", {
          noauth: true,
          body: { mobile: "{{customerMobile}}", code: "{{otp}}", channel: "WEB" },
          desc: "بدون كلمة مرور. يحفظ customerToken",
          event: saveToken("customerToken", [
            "if (json.user?.id) pm.collectionVariables.set('accountId', json.user.id);",
          ]),
        }),
        req("خبيرة — 1 إرسال OTP", "POST", "/auth/phone/start", {
          noauth: true,
          body: { mobile: "{{providerMobile}}", channel: "WEB" },
          desc: "الخبيرة تدخل بالجوال فقط. يرسل OTP. في التطوير الرمز {{otp}}.",
        }),
        req("خبيرة — 2 تحقق OTP", "POST", "/auth/phone/verify", {
          noauth: true,
          body: { mobile: "{{providerMobile}}", code: "{{otp}}", channel: "WEB" },
          desc: "بدون كلمة مرور. يحفظ providerToken و providerId",
          event: saveToken("providerToken", [
            "if (json.user?.id) {",
            "  pm.collectionVariables.set('providerId', json.user.id);",
            "  if (pm.environment) pm.environment.set('providerId', json.user.id);",
            "}",
          ]),
        }),
        req("Staff — دخول بكلمة المرور", "POST", "/auth/login", {
          noauth: true,
          body: { mobile: "{{staffMobile}}", password: "{{staffPassword}}", channel: "WEB" },
          desc: "حساب التشغيل فقط يستخدم كلمة مرور. يحفظ staffToken.",
          event: saveToken("staffToken", [
            "if (json.user?.id) pm.collectionVariables.set('staffId', json.user.id);",
          ]),
        }),
        req("GET /auth/me — عميلة", "GET", "/auth/me", { token: "customerToken" }),
        req("GET /auth/me — خبيرة", "GET", "/auth/me", { token: "providerToken" }),
        req("GET /auth/me — Staff", "GET", "/auth/me", { token: "staffToken" }),
        req("POST /auth/ping", "POST", "/auth/ping", {
          token: "staffToken",
          body: {},
          desc: "تحديث lastActiveAt (أي توكن صالح)",
        }),
        req("POST /auth/otp/send", "POST", "/auth/otp/send", {
          noauth: true,
          body: { mobile: "{{customerMobile}}", purpose: "LOGIN" },
        }),
        req("POST /auth/otp/verify", "POST", "/auth/otp/verify", {
          noauth: true,
          body: { mobile: "{{customerMobile}}", purpose: "LOGIN", code: "{{otp}}" },
        }),
        req("POST /auth/forgot-password", "POST", "/auth/forgot-password", {
          noauth: true,
          body: { mobile: "{{staffMobile}}" },
        }),
        req("POST /auth/reset-password", "POST", "/auth/reset-password", {
          noauth: true,
          body: { mobile: "{{staffMobile}}", code: "{{otp}}", newPassword: "{{staffPassword}}" },
        }),
        req("POST /auth/staff/set-password", "POST", "/auth/staff/set-password", {
          noauth: true,
          body: { mobile: "{{staffMobile}}", code: "{{otp}}", newPassword: "{{staffPassword}}" },
        }),
        req("POST /auth/staff/change-password", "POST", "/auth/staff/change-password", {
          token: "staffToken",
          body: { currentPassword: "{{staffPassword}}", newPassword: "{{staffPassword}}" },
        }),
        req("حساب جديد — عميلة (phone/complete)", "POST", "/auth/phone/complete", {
          noauth: true,
          body: {
            mobile: "0505555555",
            code: "{{otp}}",
            accountType: "CUSTOMER",
            displayName: "لينا",
            cityId: "{{cityId}}",
            acceptTerms: true,
            channel: "WEB",
          },
          desc: "بعد phone/start و phone/verify لحساب جديد. بدون كلمة مرور.",
        }),
        req("حساب جديد — خبيرة (phone/complete)", "POST", "/auth/phone/complete", {
          noauth: true,
          body: {
            mobile: "0509876543",
            code: "{{otp}}",
            accountType: "PROVIDER",
            displayName: "لمى",
            cityId: "{{cityId}}",
            acceptTerms: true,
            channel: "WEB",
          },
          desc: "بعد phone/start و phone/verify لحساب جديد. بدون كلمة مرور.",
        }),
        req("POST /auth/logout — عميلة", "POST", "/auth/logout", {
          token: "customerToken",
          body: {},
        }),
      ],
      null,
    ),

    folder("2. Customer — عميلة", [
      req("GET /customer/profile", "GET", "/customer/profile"),
      req("PATCH /customer/profile", "PATCH", "/customer/profile", {
        body: { displayName: "سارة", cityId: "{{cityId}}", bio: "أحب تجارب التجميل الطبيعية" },
      }),
      req("POST /customer/avatar", "POST", "/customer/avatar", {
        formdata: [{ key: "file", type: "file", src: "", description: "اختاري صورة" }],
      }),
      req("GET /customer/favorites", "GET", "/customer/favorites"),
      req("POST /customer/favorites", "POST", "/customer/favorites", {
        body: { targetType: "PROVIDER", targetId: "{{providerId}}" },
      }),
      req("DELETE /customer/favorites", "DELETE", "/customer/favorites", {
        body: { targetType: "PROVIDER", targetId: "{{providerId}}" },
      }),
      req("GET /customer/recent-views", "GET", "/customer/recent-views"),
      req("GET /customer/ticket-types", "GET", "/customer/ticket-types"),
      req("GET /customer/tickets", "GET", "/customer/tickets", {
        event: saveJson(["if (json?.[0]?.id) pm.collectionVariables.set('ticketId', json[0].id);"]),
      }),
      req("POST /customer/tickets", "POST", "/customer/tickets", {
        body: {
          typeCode: "CU-SUPPORT",
          title: "استفسار عن خبيرة",
          body: "أحتاج مساعدة في اختيار خبيرة مكياج في الرياض",
        },
      }),
      req("GET /customer/complaints", "GET", "/customer/complaints"),
      req("POST /customer/complaints", "POST", "/customer/complaints", {
        body: {
          targetUserId: "{{providerId}}",
          reason: "التواصل عبر واتساب لم يتم بالشكل المتوقع",
        },
      }),
      req("POST /providers/:id/ratings", "POST", "/providers/{{providerId}}/ratings", {
        body: { stars: 5, note: "تجربة ممتازة" },
        desc: "تقييم خبيرة — يحتاج توكن عميلة",
      }),
      req("GET /notifications", "GET", "/notifications", {
        event: saveJson([
          "if (json?.[0]?.id) pm.collectionVariables.set('notificationId', json[0].id);",
        ]),
      }),
      req("PATCH /notifications/:id/read", "PATCH", "/notifications/{{notificationId}}/read"),
      req("POST /notifications/read-all", "POST", "/notifications/read-all"),
    ], "customerToken"),

    folder("3. Provider — خبيرة", [
      req("GET /provider/profile", "GET", "/provider/profile"),
      req("PATCH /provider/profile", "PATCH", "/provider/profile", {
        body: {
          displayName: "نورة",
          bio: "خبيرة شعر في الرياض",
          whatsapp: "{{providerMobile}}",
          cityId: "{{cityId}}",
        },
      }),
      req("POST /provider/avatar", "POST", "/provider/avatar", {
        formdata: [{ key: "file", type: "file", src: "" }],
      }),
      req("GET /provider/dashboard", "GET", "/provider/dashboard"),
      req("GET /provider/services", "GET", "/provider/services", {
        event: saveJson([
          "const first = json?.items?.[0] || json?.[0];",
          "if (first?.id) pm.collectionVariables.set('providerServiceId', first.id);",
        ]),
      }),
      req("POST /provider/services", "POST", "/provider/services", {
        body: { serviceId: "{{serviceId}}", subServiceId: "{{subServiceId}}", isPrimary: true },
      }),
      req("PUT /provider/services/order", "PUT", "/provider/services/order", {
        body: { ids: ["{{providerServiceId}}"] },
      }),
      req("PATCH /provider/services/:id", "PATCH", "/provider/services/{{providerServiceId}}", {
        body: { isActive: true, isPrimary: true },
      }),
      req("DELETE /provider/services/:id", "DELETE", "/provider/services/{{providerServiceId}}"),
      req("DELETE /provider/services/main/:serviceId", "DELETE", "/provider/services/main/{{serviceId}}"),
      req("GET /provider/coverage", "GET", "/provider/coverage"),
      req("PUT /provider/coverage", "PUT", "/provider/coverage", {
        body: { areaIds: ["{{coverageAreaId}}"] },
      }),
      req("GET /provider/albums", "GET", "/provider/albums", {
        event: saveJson(["if (json?.[0]?.id) pm.collectionVariables.set('albumId', json[0].id);"]),
      }),
      req("POST /provider/albums", "POST", "/provider/albums", {
        body: { name: "أعمال العرائس" },
      }),
      req("GET /provider/albums/:id", "GET", "/provider/albums/{{albumId}}"),
      req("PATCH /provider/albums/:id", "PATCH", "/provider/albums/{{albumId}}", {
        body: { name: "أعمال العرائس", isActive: true },
      }),
      req("DELETE /provider/albums/:id", "DELETE", "/provider/albums/{{albumId}}"),
      req("GET /provider/portfolio", "GET", "/provider/portfolio", {
        query: { albumId: "{{albumId}}" },
        event: saveJson(["if (json?.[0]?.id) pm.collectionVariables.set('portfolioId', json[0].id);"]),
      }),
      req("POST /provider/portfolio", "POST", "/provider/portfolio", {
        formdata: [
          { key: "file", type: "file", src: "" },
          { key: "kind", value: "IMAGE", type: "text" },
          { key: "albumId", value: "{{albumId}}", type: "text" },
        ],
      }),
      req("DELETE /provider/portfolio/:id", "DELETE", "/provider/portfolio/{{portfolioId}}"),
      req("GET /provider/reviews", "GET", "/provider/reviews"),
      req("GET /provider/views", "GET", "/provider/views"),
      req("GET /provider/subscription", "GET", "/provider/subscription", {
        event: saveJson([
          "const id = json?.current?.package?.id || json?.packages?.[0]?.id;",
          "if (id) pm.collectionVariables.set('packageId', id);",
        ]),
      }),
      req("POST /provider/subscription/campaign", "POST", "/provider/subscription/campaign", {
        body: { packageId: "{{packageId}}" },
      }),
      req("GET /provider/payment-proofs", "GET", "/provider/payment-proofs"),
      req("POST /provider/payment-proofs/file", "POST", "/provider/payment-proofs/file", {
        formdata: [{ key: "file", type: "file", src: "" }],
      }),
      req("POST /provider/payment-proofs", "POST", "/provider/payment-proofs", {
        body: {
          packageId: "{{packageId}}",
          amount: 299,
          transferText: "تم التحويل على حساب المنصة",
          reference: "TRX-1001",
          kind: "TEXT",
        },
      }),
      req("GET /provider/ticket-types", "GET", "/provider/ticket-types"),
      req("GET /provider/tickets", "GET", "/provider/tickets"),
      req("POST /provider/tickets", "POST", "/provider/tickets", {
        body: {
          typeCode: "BM-SUPPORT",
          title: "مشكلة في ظهور الملف",
          body: "الملف لا يظهر في نتائج البحث بعد تفعيل الباقة",
        },
      }),
      req("GET /notifications", "GET", "/notifications"),
      req("POST /notifications/read-all", "POST", "/notifications/read-all"),
    ], "providerToken"),

    folder("4. Staff — تشغيل", [
      req("GET /ops/me", "GET", "/ops/me"),
      req("PATCH /ops/me", "PATCH", "/ops/me", { body: { displayName: "مشغل إداري" } }),
      req("GET /ops/dashboard", "GET", "/ops/dashboard"),
      req("GET /ops/events", "GET", "/ops/events", { query: { q: "" } }),
      req("GET /ops/team-activity", "GET", "/ops/team-activity"),

      folder("حسابات العملاء", [
        req("GET /ops/accounts", "GET", "/ops/accounts", {
          query: { accountType: "PROVIDER" },
          event: saveJson([
            "if (json?.[0]?.id) pm.collectionVariables.set('accountId', json[0].id);",
            "const provider = (json || []).find((row) => row.accountType === 'PROVIDER');",
            "if (provider?.id) pm.collectionVariables.set('providerId', provider.id);",
          ]),
        }),
        req("GET /ops/accounts/:id", "GET", "/ops/accounts/{{accountId}}"),
        req("PATCH /ops/accounts/:id", "PATCH", "/ops/accounts/{{accountId}}", {
          body: { reason: "تحديث حالة الحساب من بوستمان" },
        }),
        req("POST /ops/accounts/:id/notify", "POST", "/ops/accounts/{{accountId}}/notify", {
          body: { titleAr: "تنبيه", bodyAr: "رسالة تجريبية من التشغيل" },
        }),
        req("POST /ops/broadcast", "POST", "/ops/broadcast", {
          body: {
            audience: "PROVIDER",
            titleAr: "إشعار جماعي",
            bodyAr: "رسالة تجريبية لكل الخبيرات",
          },
        }),
        req("GET /ops/banned-phones", "GET", "/ops/banned-phones"),
        req("POST /ops/banned-phones", "POST", "/ops/banned-phones", {
          body: { mobile: "0599999999", reason: "اختبار حظر من بوستمان" },
        }),
        req("POST /ops/banned-phones/:mobile/lift", "POST", "/ops/banned-phones/0599999999/lift"),
      ]),

      folder("اعتمادات", [
        req("GET /ops/media", "GET", "/ops/media", {
          query: { status: "PENDING" },
          event: saveJson(["if (json?.[0]?.id) pm.collectionVariables.set('mediaId', json[0].id);"]),
        }),
        req("POST /ops/media/:id/review", "POST", "/ops/media/{{mediaId}}/review", {
          body: { approve: true, note: "تم الاعتماد" },
        }),
        req("POST /ops/media/:id/escalate-finance", "POST", "/ops/media/{{mediaId}}/escalate-finance"),
        req("GET /ops/providers/pending", "GET", "/ops/providers/pending"),
        req("POST /ops/providers/:id/review", "POST", "/ops/providers/{{providerId}}/review", {
          body: { approve: true },
        }),
        req("GET /ops/profile-changes", "GET", "/ops/profile-changes", { query: { status: "PENDING" } }),
        req("POST /ops/profile-changes/:id/review", "POST", "/ops/profile-changes/{{mediaId}}/review", {
          body: { approve: true },
        }),
        req("GET /ops/ratings", "GET", "/ops/ratings", { query: { status: "PENDING" } }),
        req("POST /ops/ratings/:id/review", "POST", "/ops/ratings/{{mediaId}}/review", {
          body: { approve: true },
        }),
        req("GET /ops/complaints", "GET", "/ops/complaints"),
        req("PATCH /ops/complaints/:id", "PATCH", "/ops/complaints/{{ticketId}}", {
          body: { status: "CLOSED", note: "تم الإغلاق" },
        }),
      ]),

      folder("الباقات والحملات", [
        req("GET /ops/packages", "GET", "/ops/packages", {
          event: saveJson(["if (json?.[0]?.id) pm.collectionVariables.set('packageId', json[0].id);"]),
        }),
        req("POST /ops/packages", "POST", "/ops/packages", {
          body: {
            nameAr: "باقة تجريبية",
            nameEn: "Test package",
            durationMonths: 1,
            price: 99,
          },
        }),
        req("PATCH /ops/packages/:id", "PATCH", "/ops/packages/{{packageId}}", {
          body: { isActive: true },
        }),
        req("GET /ops/campaigns", "GET", "/ops/campaigns"),
        req("POST /ops/campaigns", "POST", "/ops/campaigns", {
          body: {
            packageId: "{{packageId}}",
            nameAr: "حملة تجريبية",
            startDate: "2026-11-01",
            endDate: "2026-12-31",
            benefitDays: 14,
            clipToEndDate: true,
            isActive: true,
          },
        }),
      ]),

      folder("الخدمات والمناطق", [
        req("GET /ops/catalog", "GET", "/ops/catalog"),
        req("POST /ops/catalog", "POST", "/ops/catalog", {
          body: { nameAr: "خدمة تجريبية", nameEn: "Test service", sortOrder: 99, isVisible: true },
        }),
        req("PATCH /ops/catalog/:id", "PATCH", "/ops/catalog/{{serviceId}}", {
          body: { isVisible: true },
        }),
        req("DELETE /ops/catalog/:id", "DELETE", "/ops/catalog/{{serviceId}}"),
        req("POST /ops/catalog/:id/image", "POST", "/ops/catalog/{{serviceId}}/image", {
          formdata: [{ key: "file", type: "file", src: "" }],
        }),
        req("DELETE /ops/catalog/:id/image", "DELETE", "/ops/catalog/{{serviceId}}/image"),
        req("POST /ops/catalog/:id/sub-services", "POST", "/ops/catalog/{{serviceId}}/sub-services", {
          body: { nameAr: "فرعية تجريبية", nameEn: "Test sub", sortOrder: 1, isVisible: true },
        }),
        req("PATCH /ops/sub-services/:id", "PATCH", "/ops/sub-services/{{subServiceId}}", {
          body: { isVisible: true },
        }),
        req("DELETE /ops/sub-services/:id", "DELETE", "/ops/sub-services/{{subServiceId}}"),
        req("GET /ops/regions", "GET", "/ops/regions"),
        req("POST /ops/regions", "POST", "/ops/regions", {
          body: { nameAr: "منطقة تجريبية", nameEn: "Test region", sortOrder: 99, isVisible: true },
        }),
        req("PATCH /ops/regions/:id", "PATCH", "/ops/regions/{{regionId}}", {
          body: { isVisible: true },
        }),
        req("GET /ops/cities", "GET", "/ops/cities"),
        req("POST /ops/cities", "POST", "/ops/cities", {
          body: {
            nameAr: "مدينة تجريبية",
            nameEn: "Test city",
            regionId: "{{regionId}}",
            isVisible: true,
          },
        }),
        req("PATCH /ops/cities/:id", "PATCH", "/ops/cities/{{cityId}}", { body: { isVisible: true } }),
        req("POST /ops/coverage", "POST", "/ops/coverage", {
          body: { nameAr: "نطاق تجريبي", nameEn: "Test coverage", cityId: "{{cityId}}", isVisible: true },
        }),
        req("PATCH /ops/coverage/:id", "PATCH", "/ops/coverage/{{coverageAreaId}}", {
          body: { isVisible: true },
        }),
      ]),

      folder("الموظفين والصلاحيات", [
        req("GET /ops/staff", "GET", "/ops/staff", {
          event: saveJson(["if (json?.[0]?.id) pm.collectionVariables.set('staffId', json[0].id);"]),
        }),
        req("GET /ops/staff/:id", "GET", "/ops/staff/{{staffId}}"),
        req("POST /ops/staff", "POST", "/ops/staff", {
          body: {
            mobile: "0500000009",
            displayName: "موظفة تجريبية",
            roleId: "{{roleId}}",
          },
        }),
        req("PATCH /ops/staff/:id", "PATCH", "/ops/staff/{{staffId}}", {
          body: { displayName: "موظفة تجريبية" },
        }),
        req("GET /ops/roles", "GET", "/ops/roles", {
          event: saveJson(["if (json?.[0]?.id) pm.collectionVariables.set('roleId', json[0].id);"]),
        }),
        req("GET /ops/permissions", "GET", "/ops/permissions"),
        req("PATCH /ops/roles/:id/permissions", "PATCH", "/ops/roles/{{roleId}}/permissions", {
          body: { permissionCodes: ["USR-01"] },
        }),
        req("PATCH /ops/staff/:id/permissions", "PATCH", "/ops/staff/{{staffId}}/permissions", {
          body: { permissionCodes: ["USR-01"] },
        }),
        req("GET /ops/org", "GET", "/ops/org", {
          event: saveJson([
            "const first = json?.[0] || json?.departments?.[0];",
            "if (first?.id) pm.collectionVariables.set('departmentId', first.id);",
          ]),
        }),
        req("POST /ops/org/departments", "POST", "/ops/org/departments", {
          body: { nameAr: "قسم تجريبي", nameEn: "Test department" },
        }),
        req("POST /ops/org/teams", "POST", "/ops/org/teams", {
          body: { nameAr: "فريق تجريبي", nameEn: "Test team", departmentId: "{{departmentId}}" },
        }),
      ]),

      folder("التذاكر والإعدادات", [
        req("GET /ops/ticket-types", "GET", "/ops/ticket-types"),
        req("GET /ops/tickets", "GET", "/ops/tickets", {
          event: saveJson(["if (json?.[0]?.id) pm.collectionVariables.set('ticketId', json[0].id);"]),
        }),
        req("POST /ops/tickets", "POST", "/ops/tickets", {
          body: { typeCode: "OP-SUPPORT", title: "تذكرة داخلية", body: "طلب تجريبي من بوستمان" },
        }),
        req("PATCH /ops/tickets/:id", "PATCH", "/ops/tickets/{{ticketId}}", {
          body: { status: "IN_PROGRESS", claim: true, note: "استلام التذكرة" },
        }),
        req("POST /ops/tickets/:id/comments", "POST", "/ops/tickets/{{ticketId}}/comments", {
          body: { body: "تعليق تجريبي" },
        }),
        req("GET /ops/settings", "GET", "/ops/settings"),
        req("PATCH /ops/settings", "PATCH", "/ops/settings", {
          body: { key: "terms_version", value: "1" },
        }),
        req("GET /ops/welcome-messages", "GET", "/ops/welcome-messages"),
        req("GET /ops/legal", "GET", "/ops/legal"),
        req("GET /ops/bank-accounts", "GET", "/ops/bank-accounts"),
        req("POST /ops/bank-accounts", "POST", "/ops/bank-accounts", {
          body: {
            bankName: "الراجحي",
            accountName: "انوثتي",
            iban: "SA0380000000608010167519",
            isActive: true,
          },
        }),
        req("GET /notifications", "GET", "/notifications"),
        req("POST /notifications/read-all", "POST", "/notifications/read-all"),
      ]),
    ], "staffToken"),
  ],
};

const environment = {
  id: "onothiti-local",
  name: "أنوثتي Local",
  values: [
    { key: "baseUrl", value: "http://localhost:3000", enabled: true },
    { key: "customerMobile", value: "0504444444", enabled: true },
    { key: "providerMobile", value: "0501111111", enabled: true },
    { key: "staffMobile", value: "0500000001", enabled: true },
    { key: "staffPassword", value: "Secret123", enabled: true },
    { key: "otp", value: "123456", enabled: true },
    { key: "customerToken", value: "", enabled: true },
    { key: "providerToken", value: "", enabled: true },
    { key: "staffToken", value: "", enabled: true },
    { key: "cityId", value: "", enabled: true },
    { key: "serviceId", value: "", enabled: true },
    { key: "providerId", value: "", enabled: true },
    { key: "packageId", value: "", enabled: true },
    { key: "accountId", value: "", enabled: true },
  ],
  _postman_variable_scope: "environment",
};

writeFileSync(join(dir, "Onothiti.postman_collection.json"), JSON.stringify(collection, null, 2));
writeFileSync(join(dir, "Onothiti.postman_environment.json"), JSON.stringify(environment, null, 2));
console.log("Wrote Onothiti.postman_collection.json and Onothiti.postman_environment.json");
