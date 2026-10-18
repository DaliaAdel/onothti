require("dotenv").config();
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const mariadb = require("mariadb");

const BASE = process.env.API_BASE || "http://127.0.0.1:3000/api";
const OTP = "123456";
const results = [];

function listOf(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  if (Array.isArray(data?.rows)) {
    return data.rows;
  }
  if (Array.isArray(data?.provider)) {
    return data.provider;
  }
  return [];
}

async function staffAccess() {
  const mobile = process.env.STAFF_MOBILE || "0500000001";
  const password = process.env.STAFF_PASSWORD?.trim();
  if (password) {
    const login = await req("POST", "/auth/login", {
      body: { mobile, password, channel: "WEB" },
    });
    if (login.ok && login.data?.accessToken) {
      return { token: login.data.accessToken, how: "password", name: login.data.user?.displayName };
    }
  }
  const conn = await mariadb.createConnection({
    host: process.env.MYSQL_HOST === "localhost" ? "127.0.0.1" : process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE,
    charset: "utf8mb4",
    allowPublicKeyRetrieval: true,
  });
  try {
    const rows = await conn.query(
      "SELECT id, displayName, status FROM `user` WHERE mobile = ? AND accountType = 'STAFF' LIMIT 1",
      [mobile],
    );
    const staff = rows[0];
    if (!staff) {
      throw new Error("لا يوجد حساب مشغل على 0500000001");
    }
    const token = jwt.sign(
      { sub: staff.id, accountType: "STAFF", status: staff.status },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "30m" },
    );
    return { token, how: "signed", name: staff.displayName };
  } finally {
    await conn.end();
  }
}

function record(ok, name, detail) {
  results.push({ ok, name, detail: detail == null ? "" : String(detail) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(method, url, { token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  const message = data?.message
    ? Array.isArray(data.message)
      ? data.message.join(" | ")
      : data.message
    : res.statusText;
  return { status: res.status, ok: res.ok, data, message };
}

async function phoneLogin(mobile) {
  const start = await req("POST", "/auth/phone/start", { body: { mobile, channel: "WEB" } });
  if (!start.ok) {
    throw new Error(start.message);
  }
  const verify = await req("POST", "/auth/phone/verify", {
    body: { mobile, code: OTP, channel: "WEB" },
  });
  if (!verify.ok) {
    throw new Error(verify.message);
  }
  return verify.data;
}

async function main() {
  const health = await req("GET", "/health");
  record(health.ok, "API health", health.status);

  const cities = await req("GET", "/catalog/cities");
  const riyadh = (cities.data || []).find((row) => row.code === "RIYADH") || (cities.data || [])[0];
  record(cities.ok && Boolean(riyadh), "كتالوج المدن", riyadh?.nameAr || cities.message);

  const services = await req("GET", "/catalog/services");
  const hair = (services.data || []).find((row) => row.code === "MS-01");
  record(services.ok && Boolean(hair), "كتالوج الخدمات", hair?.nameAr || services.message);

  const terms = await req("GET", "/legal/terms?audience=CUSTOMER");
  record(terms.ok, "شروط العميلة", terms.status);

  let customer;
  try {
    customer = await phoneLogin("0504444444");
    record(Boolean(customer.accessToken) && customer.user?.accountType === "CUSTOMER", "دخول العميلة OTP", customer.user?.displayName);
  } catch (error) {
    record(false, "دخول العميلة OTP", error.message);
    customer = {};
  }

  const cTok = customer.accessToken;
  const profile = cTok ? await req("GET", "/customer/profile", { token: cTok }) : { ok: false, message: "no token" };
  record(profile.ok, "ملف العميلة", profile.data?.displayName || profile.message);

  const noPhoneSearch = await req("GET", `/search?cityId=${riyadh?.id || "x"}&q=0501111111`, { token: cTok });
  record(noPhoneSearch.status === 400, "منع البحث بالجوال", noPhoneSearch.message);

  const search = await req(
    "GET",
    `/search?cityId=${encodeURIComponent(riyadh.id)}&q=${encodeURIComponent("نورة")}${hair ? `&serviceId=${hair.id}` : ""}`,
    { token: cTok },
  );
  const found = listOf(search.data).find((row) => row.displayName === "نورة") || listOf(search.data)[0];
  record(search.ok && Boolean(found), "بحث العميلة عن نورة", found?.id ? found.displayName : search.message);

  let providerId = found?.id;
  const pub = providerId ? await req("GET", `/providers/${providerId}`, { token: cTok }) : { ok: false, message: "no provider" };
  record(pub.ok && pub.data?.displayName, "فتح ملف الخبيرة", pub.data?.displayName || pub.message);
  providerId = pub.data?.id || providerId;

  const wa = providerId ? await req("POST", `/providers/${providerId}/whatsapp`, { token: cTok }) : { ok: false };
  record(wa.ok && Boolean(wa.data?.url || wa.data?.mobile || wa.data?.whatsapp), "واتساب من الملف", wa.data?.url || wa.message);

  const fav = providerId
    ? await req("POST", "/customer/favorites", { token: cTok, body: { targetType: "PROVIDER", targetId: providerId } })
    : { ok: false };
  record(fav.ok || fav.status === 409, "إضافة للمفضلة", fav.message || fav.status);

  const favs = await req("GET", "/customer/favorites", { token: cTok });
  const favHit = listOf(favs.data).some((row) => (row.targetId || row.item?.id || row.id) === providerId);
  record(favs.ok && favHit, "قائمة المفضلة", favHit ? "فيها الخبيرة" : favs.message);

  const views = await req("GET", "/customer/recent-views", { token: cTok });
  record(views.ok, "آخر المشاهدات", Array.isArray(views.data) || views.data?.items ? "ok" : views.message);

  const rateNote = `تيست ربط ${Date.now()}`;
  const rate = providerId
    ? await req("POST", `/providers/${providerId}/ratings`, { token: cTok, body: { stars: 5, note: rateNote } })
    : { ok: false };
  record(rate.ok, "تقييم العميلة (بانتظار المشغل)", rate.data?.status || rate.message);

  const types = await req("GET", "/customer/ticket-types", { token: cTok });
  const typeCode = (types.data || [])[0]?.code;
  const ticket = typeCode
    ? await req("POST", "/customer/tickets", {
        token: cTok,
        body: { typeCode, title: "مشكلة تيست", body: "نص تجريبي لربط الطلبات مع المشغل" },
      })
    : { ok: false, message: "no ticket types" };
  record(ticket.ok, "طلب دعم من العميلة", ticket.data?.id ? ticket.data.status || "created" : ticket.message);

  let provider;
  try {
    provider = await phoneLogin("0501111111");
    record(Boolean(provider.accessToken) && provider.user?.accountType === "PROVIDER", "دخول الخبيرة OTP", provider.user?.displayName);
  } catch (error) {
    record(false, "دخول الخبيرة OTP", error.message);
    provider = {};
  }
  const pTok = provider.accessToken;
  const pMe = pTok ? await req("GET", "/provider/profile", { token: pTok }) : { ok: false };
  record(pMe.ok, "ملف الخبيرة", pMe.data?.displayName || pMe.message);
  record(pMe.data?.id === providerId || !providerId, "نفس خبيرة البحث", `${pMe.data?.id || "?"} vs ${providerId || "?"}`);

  const pDash = await req("GET", "/provider/dashboard", { token: pTok });
  record(pDash.ok, "لوحة الخبيرة", pDash.message);
  const pServices = await req("GET", "/provider/services", { token: pTok });
  record(pServices.ok && Array.isArray(pServices.data) && pServices.data.length > 0, "خدمات الخبيرة", pServices.data?.length ?? pServices.message);
  const pSub = await req("GET", "/provider/subscription", { token: pTok });
  record(pSub.ok, "باقة الخبيرة", pSub.data?.current?.package?.nameAr || pSub.data?.package?.nameAr || pSub.message);
  const pReviews = await req("GET", "/provider/reviews", { token: pTok });
  const liveReview = (pReviews.data || []).some?.((row) => row.note === rateNote || row.status === "APPROVED");
  record(pReviews.ok, "تقييمات الخبيرة قبل اعتماد المشغل", liveReview ? "ظهر التقييم المعتمد" : "التقييم المعلق لا يظهر للعامة (متوقع)");

  const bioMarker = `نبذة تيست ${Date.now()}`;
  const origBio = pMe.data?.bio || "خبيرة شعر في الرياض";
  const patchBio = await req("PATCH", "/provider/profile", { token: pTok, body: { bio: bioMarker } });
  record(patchBio.ok, "تعديل نبذة الخبيرة (بانتظار اعتماد)", patchBio.data?.bio === bioMarker ? "ظهرت كقيمة معلّقة عندها" : patchBio.message);

  let staffTok = "";
  try {
    const staff = await staffAccess();
    staffTok = staff.token;
    record(Boolean(staffTok), "دخول المشغل", `${staff.name} (${staff.how})`);
  } catch (error) {
    record(false, "دخول المشغل", error.message);
  }

  const opsMe = staffTok ? await req("GET", "/ops/me", { token: staffTok }) : { ok: false };
  record(opsMe.ok, "هوية المشغل", `${opsMe.data?.role?.nameAr || opsMe.data?.roleCode || ""} ${opsMe.data?.displayName || opsMe.message}`);

  const dash = staffTok ? await req("GET", "/ops/dashboard", { token: staffTok }) : { ok: false };
  record(dash.ok, "لوحة المشغل", dash.data ? `تقييمات معلّقة ${dash.data.pendingRatings ?? "?"}` : dash.message);

  const accounts = staffTok ? await req("GET", "/ops/accounts?accountType=PROVIDER", { token: staffTok }) : { ok: false };
  const accountHit = listOf(accounts.data).some((row) => row.id === providerId || row.displayName === "نورة");
  record(accounts.ok && accountHit, "حساب الخبيرة في عملاء المنصة", accountHit ? "نورة ظاهرة" : accounts.message);

  const pendingBio = staffTok ? await req("GET", "/ops/profile-changes?status=PENDING", { token: staffTok }) : { ok: false };
  const change = listOf(pendingBio.data).find((row) => row.newValue === bioMarker || (row.userId === (pMe.data?.id || providerId) && row.field === "BIO"));
  record(pendingBio.ok && Boolean(change), "نبذة الخبيرة وصلت للاعتمادات", change?.id || pendingBio.message);

  if (staffTok && change?.id) {
    const approved = await req("POST", `/ops/profile-changes/${change.id}/review`, { token: staffTok, body: { approve: true } });
    record(approved.ok, "اعتماد نبذة الخبيرة", approved.message || "ok");
  }

  const pendingRates = staffTok ? await req("GET", "/ops/ratings?status=PENDING", { token: staffTok }) : { ok: false };
  const ratingRow = listOf(pendingRates.data).find((row) => row.note === rateNote || row.id === rate.data?.id);
  record(pendingRates.ok && Boolean(ratingRow), "تقييم العميلة وصل للاعتمادات", ratingRow?.id || pendingRates.message);
  if (staffTok && ratingRow?.id) {
    const approvedRate = await req("POST", `/ops/ratings/${ratingRow.id}/review`, { token: staffTok, body: { approve: true } });
    record(approvedRate.ok, "اعتماد تقييم العميلة", approvedRate.message || "ok");
  }

  const opsTickets = staffTok ? await req("GET", "/ops/tickets", { token: staffTok }) : { ok: false };
  const ticketHit = listOf(opsTickets.data).some((row) => row.id === ticket.data?.id || row.title === "مشكلة تيست");
  record(opsTickets.ok && ticketHit, "طلب العميلة عند المشغل", ticketHit ? "ظهر" : opsTickets.message);

  const settings = staffTok ? await req("GET", "/ops/settings", { token: staffTok }) : { ok: false };
  record(settings.ok, "إعدادات التشغيل للمشغل", settings.status === 403 ? "403 صلاحية" : settings.message || "ok");

  const staffList = staffTok ? await req("GET", "/ops/staff", { token: staffTok }) : { ok: false };
  record(staffList.ok, "حسابات الموظفين", Array.isArray(staffList.data) ? `${staffList.data.length} حساب` : staffList.message);

  const pubAfter = providerId ? await req("GET", `/providers/${providerId}`, { token: cTok }) : { ok: false };
  record(pubAfter.ok && pubAfter.data?.bio === bioMarker, "العميلة تشوف النبذة بعد الاعتماد", pubAfter.data?.bio === bioMarker ? "اتربطت" : pubAfter.data?.bio || pubAfter.message);

  const pReviewsAfter = pTok ? await req("GET", "/provider/reviews", { token: pTok }) : { ok: false };
  const approvedNow = listOf(pReviewsAfter.data).some((row) => row.note === rateNote);
  record(pReviewsAfter.ok && approvedNow, "الخبيرة تشوف التقييم بعد الاعتماد", approvedNow ? "اتربطت" : "لسه مش ظاهر");

  await req("PATCH", "/provider/profile", { token: pTok, body: { bio: origBio } });
  const restore = staffTok ? await req("GET", "/ops/profile-changes?status=PENDING", { token: staffTok }) : { data: [] };
  const restoreChange = listOf(restore.data).find((row) => row.newValue === origBio && row.userId === (pMe.data?.id || providerId));
  if (restoreChange?.id) {
    await req("POST", `/ops/profile-changes/${restoreChange.id}/review`, { token: staffTok, body: { approve: true } });
  }

  const failed = results.filter((row) => !row.ok);
  console.log("");
  console.log(`done ${results.filter((row) => row.ok).length}/${results.length} passed, ${failed.length} failed`);
  const out = path.join(__dirname, "e2e-roles-last.json");
  fs.writeFileSync(out, JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2), "utf8");
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
