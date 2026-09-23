import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { applyDatabaseUrl, createMariaAdapter } from "../src/database-url";

applyDatabaseUrl();
const prisma = new PrismaClient({ adapter: createMariaAdapter() });

async function main() {
  const roles = [
    { code: "OPERATOR", nameAr: "مشغل", nameEn: "Operator" },
    { code: "OPS_LEAD", nameAr: "قائد تشغيل", nameEn: "Operations Lead" },
    { code: "ADMIN", nameAr: "إداري", nameEn: "Admin" },
    { code: "FINANCE", nameAr: "مالي", nameEn: "Finance" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role,
    });
  }

  const permissions = [
    { code: "PROVIDERS_APPROVE", nameAr: "اعتماد صانعات الجمال", nameEn: "Approve beauty providers" },
    { code: "CUSTOMERS_REVIEW", nameAr: "مراجعة العميلات", nameEn: "Review customers" },
    { code: "PAYMENTS_REVIEW", nameAr: "مراجعة الإيصالات", nameEn: "Review payment proofs" },
    { code: "PAYMENTS_CONFIRM", nameAr: "تأكيد المالية", nameEn: "Confirm finance" },
    { code: "USERS_MANAGE", nameAr: "إدارة المستخدمين", nameEn: "Manage users" },
    { code: "SETTINGS_MANAGE", nameAr: "إدارة الإعدادات", nameEn: "Manage settings" },
    { code: "REPORTS_VIEW", nameAr: "عرض التقارير", nameEn: "View reports" },
    { code: "TICKETS_MANAGE", nameAr: "إدارة الطلبات", nameEn: "Manage tickets" },
    { code: "RATINGS_REVIEW", nameAr: "مراجعة التقييمات", nameEn: "Review ratings" },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission,
    });
  }

  const regions = [
    { code: "RUH", nameAr: "الرياض", nameEn: "Riyadh" },
    { code: "MKK", nameAr: "مكة المكرمة", nameEn: "Makkah" },
    { code: "EAS", nameAr: "الشرقية", nameEn: "Eastern" },
  ];
  const regionIds: Record<string, string> = {};
  for (const region of regions) {
    const row = await prisma.region.upsert({
      where: { code: region.code },
      update: region,
      create: region,
    });
    regionIds[region.code] = row.id;
  }

  const cities = [
    { code: "RIYADH", nameAr: "الرياض", nameEn: "Riyadh", region: "RUH" },
    { code: "JEDDAH", nameAr: "جدة", nameEn: "Jeddah", region: "MKK" },
    { code: "DAMMAM", nameAr: "الدمام", nameEn: "Dammam", region: "EAS" },
    { code: "KHOBAR", nameAr: "الخبر", nameEn: "Khobar", region: "EAS" },
  ];
  for (const city of cities) {
    await prisma.city.upsert({
      where: { code: city.code },
      update: {
        nameAr: city.nameAr,
        nameEn: city.nameEn,
        isVisible: true,
        regionId: regionIds[city.region],
      },
      create: {
        code: city.code,
        nameAr: city.nameAr,
        nameEn: city.nameEn,
        isVisible: true,
        regionId: regionIds[city.region],
      },
    });
  }

  const services = [
    { code: "MS-01", nameAr: "الشعر", nameEn: "Hair" },
    { code: "MS-02", nameAr: "المكياج", nameEn: "Makeup" },
    { code: "MS-03", nameAr: "المايكروبليدنج", nameEn: "Microblading" },
    { code: "MS-04", nameAr: "الأظافر", nameEn: "Nails" },
    { code: "MS-05", nameAr: "حناء ونقش", nameEn: "Henna" },
    { code: "MS-06", nameAr: "العناية بالبشرة", nameEn: "Skin care" },
    { code: "MS-07", nameAr: "العناية بالجسم", nameEn: "Body care" },
    { code: "MS-08", nameAr: "منسقة موسيقى", nameEn: "DJ" },
    { code: "MS-09", nameAr: "منسقة الحفلات", nameEn: "Event coordinator" },
    { code: "MS-10", nameAr: "فساتين الأعراس", nameEn: "Wedding dresses" },
    { code: "MS-11", nameAr: "المصورات", nameEn: "Photographers" },
    { code: "MS-12", nameAr: "الموديل", nameEn: "Model" },
    { code: "MS-13", nameAr: "ركن المشروبات", nameEn: "Beverage corner" },
    { code: "MS-14", nameAr: "التخريم", nameEn: "Piercing" },
  ];
  for (const [index, service] of services.entries()) {
    await prisma.service.upsert({
      where: { code: service.code },
      update: { ...service, sortOrder: index + 1, isVisible: true },
      create: { ...service, sortOrder: index + 1, isVisible: true },
    });
  }

  const serviceRows = await prisma.service.findMany();
  const serviceIdByCode = Object.fromEntries(
    serviceRows.map((row) => [row.code, row.id]),
  );

  const subServices: { parent: string; code: string; nameAr: string; nameEn: string }[] = [
    { parent: "MS-01", code: "MS-01-001", nameAr: "قص الشعر", nameEn: "Haircut" },
    { parent: "MS-01", code: "MS-01-002", nameAr: "ماسكات ومعالجات للشعر", nameEn: "Hair masks" },
    { parent: "MS-01", code: "MS-01-003", nameAr: "صبغات وسحب لون", nameEn: "Hair color" },
    { parent: "MS-01", code: "MS-01-004", nameAr: "تركيب شعر", nameEn: "Hair extension" },
    { parent: "MS-01", code: "MS-01-005", nameAr: "تركيب الرموش", nameEn: "Lash extension" },
    { parent: "MS-01", code: "MS-01-006", nameAr: "إزالة الرموش", nameEn: "Lash removal" },
    { parent: "MS-01", code: "MS-01-007", nameAr: "تساريح الشعر", nameEn: "Hairstyling" },
    { parent: "MS-02", code: "MS-02-001", nameAr: "مكياج سهرة بدون رموش", nameEn: "Evening makeup" },
    { parent: "MS-02", code: "MS-02-002", nameAr: "مكياج سهرة مع رموش", nameEn: "Evening makeup with lashes" },
    { parent: "MS-02", code: "MS-02-003", nameAr: "مكياج حفلات تخرج", nameEn: "Graduation makeup" },
    { parent: "MS-02", code: "MS-02-004", nameAr: "مكياج خفيف", nameEn: "Natural makeup" },
    { parent: "MS-02", code: "MS-02-005", nameAr: "المكياج السينمائي", nameEn: "Cinematic makeup" },
    { parent: "MS-02", code: "MS-02-006", nameAr: "مكياج العروسة", nameEn: "Bridal makeup" },
    { parent: "MS-03", code: "MS-03-001", nameAr: "خدمات المايكروبليدنج", nameEn: "Microblading" },
    { parent: "MS-03", code: "MS-03-002", nameAr: "رفع الحواجب", nameEn: "Brow lift" },
    { parent: "MS-03", code: "MS-03-003", nameAr: "رفع الرموش", nameEn: "Lash lift" },
    { parent: "MS-04", code: "MS-04-001", nameAr: "تركيب الأظافر", nameEn: "Nail extension" },
    { parent: "MS-04", code: "MS-04-002", nameAr: "إزالة الجل", nameEn: "Gel removal" },
    { parent: "MS-05", code: "MS-05-001", nameAr: "حناء ونقش", nameEn: "Henna" },
    { parent: "MS-06", code: "MS-06-001", nameAr: "تنظيف البشرة", nameEn: "Facial cleansing" },
    { parent: "MS-07", code: "MS-07-001", nameAr: "المساج", nameEn: "Massage" },
    { parent: "MS-07", code: "MS-07-002", nameAr: "الحمام المغربي", nameEn: "Moroccan bath" },
    { parent: "MS-07", code: "MS-07-003", nameAr: "الساونا", nameEn: "Sauna" },
    { parent: "MS-07", code: "MS-07-004", nameAr: "تشقير الحواجب", nameEn: "Brow bleaching" },
    { parent: "MS-07", code: "MS-07-005", nameAr: "منيكير بديكير", nameEn: "Manicure pedicure" },
    { parent: "MS-07", code: "MS-07-006", nameAr: "إزالة الشعر", nameEn: "Hair removal" },
    { parent: "MS-08", code: "MS-08-001", nameAr: "منسقة موسيقى", nameEn: "DJ" },
    { parent: "MS-08", code: "MS-08-002", nameAr: "الفرق الغنائية", nameEn: "Bands" },
    { parent: "MS-08", code: "MS-08-003", nameAr: "فرق الرقص", nameEn: "Dance troupes" },
    { parent: "MS-09", code: "MS-09-001", nameAr: "تنظيم حفلات الزفاف", nameEn: "Wedding planning" },
    { parent: "MS-09", code: "MS-09-002", nameAr: "تنظيم أعياد الميلاد", nameEn: "Birthday planning" },
    { parent: "MS-09", code: "MS-09-003", nameAr: "تنظيم حفلات التخرج", nameEn: "Graduation events" },
    { parent: "MS-09", code: "MS-09-004", nameAr: "تنظيم حفلات استقبال المولود", nameEn: "Baby shower" },
    { parent: "MS-09", code: "MS-09-005", nameAr: "تنظيم حفلات خاصة", nameEn: "Private events" },
    { parent: "MS-09", code: "MS-09-006", nameAr: "تنظيم حفلات الشركات", nameEn: "Corporate events" },
    { parent: "MS-09", code: "MS-09-007", nameAr: "تنسيق الطاولات", nameEn: "Table styling" },
    { parent: "MS-09", code: "MS-09-008", nameAr: "تنسيق الديكور", nameEn: "Decor styling" },
    { parent: "MS-09", code: "MS-09-009", nameAr: "تنسيق البوفية والضيافة", nameEn: "Hospitality styling" },
    { parent: "MS-09", code: "MS-09-010", nameAr: "تنسيق دبش العروسة", nameEn: "Bridal trousseau" },
    { parent: "MS-10", code: "MS-10-001", nameAr: "تأجير فساتين الأعراس", nameEn: "Wedding dress rental" },
    { parent: "MS-10", code: "MS-10-002", nameAr: "بيع فساتين الأعراس", nameEn: "Wedding dress sale" },
    { parent: "MS-10", code: "MS-10-003", nameAr: "خياطة الفساتين", nameEn: "Dress tailoring" },
    { parent: "MS-11", code: "MS-11-001", nameAr: "مصورات الأعراس", nameEn: "Wedding photography" },
    { parent: "MS-11", code: "MS-11-002", nameAr: "مصورات الحفلات", nameEn: "Event photography" },
    { parent: "MS-11", code: "MS-11-003", nameAr: "مصورات المنتجات", nameEn: "Product photography" },
    { parent: "MS-11", code: "MS-11-004", nameAr: "مصورات المحتوى", nameEn: "Content photography" },
    { parent: "MS-11", code: "MS-11-005", nameAr: "كشك التصوير", nameEn: "Photo booth" },
    { parent: "MS-13", code: "MS-13-001", nameAr: "بوث القهوة", nameEn: "Coffee booth" },
    { parent: "MS-13", code: "MS-13-002", nameAr: "بوث المشروبات", nameEn: "Beverage booth" },
  ];

  for (const [index, item] of subServices.entries()) {
    await prisma.subService.upsert({
      where: { code: item.code },
      update: {
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        isVisible: true,
        sortOrder: index + 1,
        serviceId: serviceIdByCode[item.parent],
      },
      create: {
        code: item.code,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        isVisible: true,
        sortOrder: index + 1,
        serviceId: serviceIdByCode[item.parent],
      },
    });
  }

  const packages = [
    {
      code: "FREE",
      nameAr: "مجانية",
      nameEn: "Free",
      durationMonths: 1,
      price: 0,
      vatPercent: 15,
      rank: 5,
      maxServices: 5,
      maxPhotos: 40,
      maxVideos: 1,
      allowWhatsApp: true,
      allowRating: true,
      hasBadge: false,
    },
    {
      code: "GREEN",
      nameAr: "خضراء",
      nameEn: "Green",
      durationMonths: 1,
      price: 0,
      vatPercent: 15,
      rank: 4,
      maxServices: 1,
      maxPhotos: 5,
      maxVideos: 0,
      allowWhatsApp: true,
      allowRating: true,
      hasBadge: false,
    },
    {
      code: "BRONZE",
      nameAr: "برونزية",
      nameEn: "Bronze",
      durationMonths: 3,
      price: 0,
      vatPercent: 15,
      rank: 3,
      maxServices: 2,
      maxPhotos: 20,
      maxVideos: 0,
      allowWhatsApp: true,
      allowRating: true,
      hasBadge: false,
    },
    {
      code: "SILVER",
      nameAr: "فضية",
      nameEn: "Silver",
      durationMonths: 6,
      price: 0,
      vatPercent: 15,
      rank: 2,
      maxServices: 3,
      maxPhotos: 40,
      maxVideos: 1,
      allowWhatsApp: true,
      allowRating: true,
      hasBadge: false,
    },
    {
      code: "GOLD",
      nameAr: "ذهبية",
      nameEn: "Gold",
      durationMonths: 12,
      price: 0,
      vatPercent: 15,
      rank: 1,
      maxServices: null,
      maxPhotos: 60,
      maxVideos: 2,
      allowWhatsApp: true,
      allowRating: true,
      hasBadge: true,
    },
  ];
  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { code: pkg.code },
      update: pkg,
      create: pkg,
    });
  }

  await prisma.setting.upsert({
    where: { key: "otp_ttl_seconds" },
    update: { value: "120" },
    create: { key: "otp_ttl_seconds", value: "120" },
  });
  await prisma.setting.upsert({
    where: { key: "whatsapp_disclaimer" },
    update: { value: "الموعد والسعر والدفع خارج المنصة" },
    create: {
      key: "whatsapp_disclaimer",
      value: "الموعد والسعر والدفع خارج المنصة",
    },
  });
  await prisma.setting.upsert({
    where: { key: "whatsapp_disclaimer_en" },
    update: { value: "Appointment, price, and payment are outside the platform" },
    create: {
      key: "whatsapp_disclaimer_en",
      value: "Appointment, price, and payment are outside the platform",
    },
  });

  await prisma.bankAccount.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {
      bankName: "بنك تجريبي",
      iban: "SA0000000000000000000000",
      accountName: "منصة أنوثتي",
      isActive: true,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      bankName: "بنك تجريبي",
      iban: "SA0000000000000000000000",
      accountName: "منصة أنوثتي",
      isActive: true,
    },
  });

  const ticketTypes = [
    { code: "CU-01", nameAr: "مشكلة تقنية", nameEn: "Technical issue", audience: "CUSTOMER" },
    { code: "CU-02", nameAr: "استفسار عام", nameEn: "General inquiry", audience: "CUSTOMER" },
    { code: "CU-03", nameAr: "شكوى على صانعة جمال", nameEn: "Complaint about a beauty provider", audience: "CUSTOMER" },
    { code: "CU-04", nameAr: "بلاغ عن حساب أو محتوى", nameEn: "Report an account or content", audience: "CUSTOMER" },
    { code: "CU-05", nameAr: "تقديم تقييم", nameEn: "Submit a rating", audience: "CUSTOMER" },
    { code: "CU-06", nameAr: "اعتراض أو متابعة تقييم", nameEn: "Rating objection or follow-up", audience: "CUSTOMER" },
    { code: "CU-07", nameAr: "تعديل بيانات خاضعة للمراجعة", nameEn: "Profile change pending review", audience: "CUSTOMER" },
    { code: "CU-08", nameAr: "ملاحظة أو اقتراح", nameEn: "Feedback or suggestion", audience: "CUSTOMER" },
    { code: "CU-09", nameAr: "طلب إلغاء أو حذف الحساب", nameEn: "Account cancellation or deletion", audience: "CUSTOMER" },
    { code: "BM-01", nameAr: "مشكلة تقنية", nameEn: "Technical issue", audience: "PROVIDER" },
    { code: "BM-02", nameAr: "استفسار عام", nameEn: "General inquiry", audience: "PROVIDER" },
    { code: "BM-03", nameAr: "اعتماد أو تحديث بيانات الملف", nameEn: "Profile data approval or update", audience: "PROVIDER" },
    { code: "BM-04", nameAr: "اعتماد صور وألبومات الأعمال", nameEn: "Portfolio photo approval", audience: "PROVIDER" },
    { code: "BM-05", nameAr: "إضافة أو تعديل الخدمات", nameEn: "Add or edit services", audience: "PROVIDER" },
    { code: "BM-06", nameAr: "تعديل المدينة أو مناطق التغطية", nameEn: "City or coverage change", audience: "PROVIDER" },
    { code: "BM-07", nameAr: "تفعيل باقة أو اشتراك", nameEn: "Activate a package or subscription", audience: "PROVIDER" },
    { code: "BM-08", nameAr: "إثبات سداد", nameEn: "Payment proof", audience: "PROVIDER" },
    { code: "BM-09", nameAr: "تجديد أو تمديد أو ترقية الباقة", nameEn: "Renew, extend, or upgrade package", audience: "PROVIDER" },
    { code: "BM-10", nameAr: "متابعة حالة الحساب أو الاشتراك", nameEn: "Account or subscription status", audience: "PROVIDER" },
    { code: "BM-11", nameAr: "اعتراض على تقييم", nameEn: "Rating objection", audience: "PROVIDER" },
    { code: "BM-12", nameAr: "شكوى أو بلاغ", nameEn: "Complaint or report", audience: "PROVIDER" },
    { code: "BM-13", nameAr: "ملاحظة أو اقتراح", nameEn: "Feedback or suggestion", audience: "PROVIDER" },
    { code: "BM-14", nameAr: "طلب إلغاء أو حذف الحساب", nameEn: "Account cancellation or deletion", audience: "PROVIDER" },
    { code: "OP-01", nameAr: "طلب تحقق مالي", nameEn: "Finance verification request", audience: "STAFF" },
    { code: "OP-02", nameAr: "طلب دعم تقني", nameEn: "Technical support request", audience: "STAFF" },
    { code: "OP-03", nameAr: "طلب قرار على حساب", nameEn: "Account decision request", audience: "STAFF" },
    { code: "OP-04", nameAr: "طلب مراجعة محتوى أو مخالفة", nameEn: "Content or violation review", audience: "STAFF" },
    { code: "OP-05", nameAr: "طلب تعديل قائمة خدمة أو مدينة", nameEn: "Service or city list change", audience: "STAFF" },
    { code: "OP-06", nameAr: "طلب صلاحية أو حساب تشغيلي", nameEn: "Staff access or account request", audience: "STAFF" },
    { code: "OP-07", nameAr: "طلب إعادة فتح", nameEn: "Reopen request", audience: "STAFF" },
    { code: "OP-08", nameAr: "طلب تقرير أو استخراج بيانات", nameEn: "Report or data extract", audience: "STAFF" },
    { code: "OP-09", nameAr: "تصعيد تأخر أو تعارض", nameEn: "Escalation for delay or conflict", audience: "STAFF" },
    { code: "AD-01", nameAr: "إنشاء أو تعديل حساب موظف", nameEn: "Create or edit staff account", audience: "STAFF" },
    { code: "AD-02", nameAr: "إيقاف أو إنهاء حساب موظف", nameEn: "Suspend or close staff account", audience: "STAFF" },
    { code: "AD-03", nameAr: "قرار حالة حساب مستخدم", nameEn: "User account status decision", audience: "STAFF" },
    { code: "AD-04", nameAr: "اعتماد تغيير تشغيلي", nameEn: "Operational change approval", audience: "STAFF" },
    { code: "AD-05", nameAr: "طلب تغيير تقني", nameEn: "Technical change request", audience: "STAFF" },
    { code: "AD-06", nameAr: "طلب مالي أو تسوية", nameEn: "Finance or settlement request", audience: "STAFF" },
    { code: "AD-07", nameAr: "إدارة حملة أو باقة", nameEn: "Campaign or package management", audience: "STAFF" },
    { code: "AD-08", nameAr: "اعتماد سياسة أو محتوى ثابت", nameEn: "Policy or static content approval", audience: "STAFF" },
    { code: "AD-09", nameAr: "طلب تقرير إداري", nameEn: "Admin report request", audience: "STAFF" },
    { code: "AD-10", nameAr: "إعادة فتح أو إغلاق استثنائي", nameEn: "Exceptional reopen or close", audience: "STAFF" },
    { code: "AD-11", nameAr: "طلب حذف بيانات", nameEn: "Data deletion request", audience: "STAFF" },
  ];

  for (const type of ticketTypes) {
    await prisma.ticketType.upsert({
      where: { code: type.code },
      update: type,
      create: type,
    });
  }

  const roleRows = await prisma.role.findMany();
  const permissionRows = await prisma.permission.findMany();
  const roleId = Object.fromEntries(roleRows.map((row) => [row.code, row.id]));
  const permissionId = Object.fromEntries(
    permissionRows.map((row) => [row.code, row.id]),
  );

  const rolePermissionMap: Record<string, string[]> = {
    OPERATOR: [
      "PROVIDERS_APPROVE",
      "CUSTOMERS_REVIEW",
      "PAYMENTS_REVIEW",
      "TICKETS_MANAGE",
      "RATINGS_REVIEW",
      "REPORTS_VIEW",
    ],
    OPS_LEAD: [
      "PROVIDERS_APPROVE",
      "CUSTOMERS_REVIEW",
      "PAYMENTS_REVIEW",
      "TICKETS_MANAGE",
      "RATINGS_REVIEW",
      "REPORTS_VIEW",
      "USERS_MANAGE",
    ],
    FINANCE: ["PAYMENTS_REVIEW", "PAYMENTS_CONFIRM", "REPORTS_VIEW"],
    ADMIN: permissionRows.map((row) => row.code),
  };

  for (const [roleCode, codes] of Object.entries(rolePermissionMap)) {
    for (const code of codes) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleId[roleCode],
            permissionId: permissionId[code],
          },
        },
        update: {},
        create: {
          roleId: roleId[roleCode],
          permissionId: permissionId[code],
        },
      });
    }
  }

  await seedDemoProviders();
  await seedDemoCustomer();

  await seedLegalPages();

  console.log("Seed completed");
}

async function seedDemoProviders() {
  const passwordHash = await bcrypt.hash("Secret123", 10);
  const riyadh = await prisma.city.findUnique({ where: { code: "RIYADH" } });
  const jeddah = await prisma.city.findUnique({ where: { code: "JEDDAH" } });
  const hair = await prisma.service.findUnique({ where: { code: "MS-01" } });
  const makeup = await prisma.service.findUnique({ where: { code: "MS-02" } });
  const nails = await prisma.service.findUnique({ where: { code: "MS-04" } });
  const gold = await prisma.package.findUnique({ where: { code: "GOLD" } });
  const silver = await prisma.package.findUnique({ where: { code: "SILVER" } });
  const bronze = await prisma.package.findUnique({ where: { code: "BRONZE" } });
  if (!riyadh || !jeddah || !hair || !makeup || !nails || !gold || !silver || !bronze) {
    return;
  }

  const demos = [
    {
      mobile: "0501111111",
      displayName: "نورة",
      accountCode: "BM-000001",
      bio: "خبيرة شعر في الرياض",
      cityId: riyadh.id,
      serviceId: hair.id,
      packageId: gold.id,
      badge: "ذهبية",
      lastActiveAt: new Date(),
    },
    {
      mobile: "0502222222",
      displayName: "هند",
      accountCode: "BM-000002",
      bio: "خبيرة مكياج",
      cityId: jeddah.id,
      serviceId: makeup.id,
      packageId: silver.id,
      badge: "فضية",
      lastActiveAt: new Date(Date.now() - 86400000),
    },
    {
      mobile: "0503333333",
      displayName: "منى",
      accountCode: "BM-000003",
      bio: "خبيرة أظافر",
      cityId: riyadh.id,
      serviceId: nails.id,
      packageId: bronze.id,
      badge: "برونزية",
      lastActiveAt: new Date(Date.now() - 172800000),
    },
  ];

  for (const demo of demos) {
    const user = await prisma.user.upsert({
      where: { mobile: demo.mobile },
      update: {
        displayName: demo.displayName,
        status: "ACTIVE",
        mobileVerifiedAt: new Date(),
        lastActiveAt: demo.lastActiveAt,
        passwordHash,
      },
      create: {
        accountType: "PROVIDER",
        mobile: demo.mobile,
        passwordHash,
        status: "ACTIVE",
        displayName: demo.displayName,
        accountCode: demo.accountCode,
        mobileVerifiedAt: new Date(),
        lastActiveAt: demo.lastActiveAt,
        providerProfile: {
          create: {
            bio: demo.bio,
            whatsapp: demo.mobile,
            cityId: demo.cityId,
            visibility: "PUBLIC",
            badge: demo.badge,
          },
        },
      },
    });

    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: demo.bio,
        whatsapp: demo.mobile,
        cityId: demo.cityId,
        visibility: "PUBLIC",
        badge: demo.badge,
      },
      create: {
        userId: user.id,
        bio: demo.bio,
        whatsapp: demo.mobile,
        cityId: demo.cityId,
        visibility: "PUBLIC",
        badge: demo.badge,
      },
    });

    const existingService = await prisma.providerService.findFirst({
      where: { providerUserId: user.id, serviceId: demo.serviceId },
    });
    if (!existingService) {
      await prisma.providerService.create({
        data: {
          providerUserId: user.id,
          serviceId: demo.serviceId,
          sortOrder: 1,
        },
      });
    }

    const activeSub = await prisma.subscription.findFirst({
      where: { providerUserId: user.id, status: "ACTIVE" },
    });
    if (!activeSub) {
      const end = new Date();
      end.setMonth(end.getMonth() + 6);
      await prisma.subscription.create({
        data: {
          providerUserId: user.id,
          packageId: demo.packageId,
          startAt: new Date(),
          endAt: end,
          status: "ACTIVE",
        },
      });
    }
  }
}

async function seedDemoCustomer() {
  const passwordHash = await bcrypt.hash("Secret123", 10);
  const riyadh = await prisma.city.findUnique({ where: { code: "RIYADH" } });
  const existing = await prisma.user.findUnique({
    where: { mobile: "0504444444" },
  });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        displayName: "سارة",
        status: "ACTIVE",
        mobileVerifiedAt: new Date(),
        passwordHash,
      },
    });
    return;
  }
  const count = await prisma.user.count({ where: { accountType: "CUSTOMER" } });
  await prisma.user.create({
    data: {
      accountType: "CUSTOMER",
      mobile: "0504444444",
      passwordHash,
      status: "ACTIVE",
      displayName: "سارة",
      accountCode: `CU-${String(count + 1).padStart(6, "0")}`,
      mobileVerifiedAt: new Date(),
      customerProfile: {
        create: { cityId: riyadh?.id },
      },
    },
  });
}

async function seedLegalPages() {
  const pages = [
    {
      code: "TERMS_CUSTOMER",
      titleAr: "الشروط والأحكام — الباحثة عن الأنوثة",
      titleEn: "Terms — Beauty seeker",
      bodyAr: [
        "باستخدام تطبيق أنوثتي كباحثة عن الأنوثة، فإنك توافقين على هذه الشروط.",
        "أنوثتي منصة اكتشاف لصانعات الجمال داخل السعودية. البحث والعرض والتواصل فقط، ولا يوجد حجز أو دفع لثمن الخدمة داخل المنصة.",
        "الموعد والسعر وطريقة الدفع تتم بينكِ وبين صانعة الجمال خارج المنصة، والمنصة ليست طرفًا في الاتفاق.",
        "التواصل يتم عبر واتساب بعد فتح ملف الصانعة. رقم الجوال لا يُستخدم في البحث.",
        "يمكنكِ تقييم الصانعة بعد التعامل. التقييم يخضع لمراجعة التشغيل قبل ظهوره.",
        "المفضلة والمشاهدات السابقة مرتبطة بحسابكِ الشخصي.",
        "الحساب شخصي، ومسؤوليتكِ المحافظة على كلمة المرور وعدم مشاركة رمز التحقق.",
      ].join("\n\n"),
      bodyEn: [
        "By using Onothiti as a beauty seeker, you agree to these terms.",
        "Onothiti is a discovery platform for beauty providers in Saudi Arabia. Search, browse, and contact only. There is no booking or service payment inside the platform.",
        "Appointment, price, and payment are between you and the provider, outside the platform.",
        "Contact is through WhatsApp after opening a profile. Mobile numbers are not used in search.",
        "You may rate a provider after dealing with them. Ratings are reviewed before they appear.",
        "Favorites and recent views are tied to your account.",
        "The account is personal. Keep your password and verification code private.",
      ].join("\n\n"),
    },
    {
      code: "TERMS_PROVIDER",
      titleAr: "الشروط والأحكام — صانعة الجمال",
      titleEn: "Terms — Beauty provider",
      bodyAr: [
        "باستخدام تطبيق أنوثتي كصانعة جمال، فإنك توافقين على هذه الشروط.",
        "الملف يظهر للباحثات بعد اعتماد التشغيل، مع حالة الحساب نشط وظهور عام.",
        "ترتيب نتائج البحث يعتمد على الباقة: ذهبية ثم فضية ثم برونزية، ثم التقييم.",
        "رقم الواتساب للتواصل فقط ولا يظهر داخل نتائج البحث بالاسم أو الخدمة.",
        "المنصة لا تحجز المواعيد ولا تحصّل أجر الخدمة. الاتفاق مع الباحثة خارج أنوثتي.",
        "الصور والوصف والخدمات المعروضة مسؤوليتكِ، ويجب أن تكون ملككِ ولا تخالف الأنظمة.",
        "يحق للمنصة إخفاء الملف أو تقييد الحساب عند مخالفة الشروط أو وجود بلاغ معتمد.",
        "الاشتراك في الباقات وفق العرض المعتمد، وإثبات الدفع يخضع للمراجعة قبل التفعيل.",
      ].join("\n\n"),
      bodyEn: [
        "By using Onothiti as a beauty provider, you agree to these terms.",
        "Your profile appears to seekers after operations approval, with an active account and public visibility.",
        "Search ranking follows the package: Gold, then Silver, then Bronze, then rating.",
        "The WhatsApp number is for contact only and does not appear in name or service search.",
        "The platform does not book appointments or collect service fees. Agreements with seekers are outside Onothiti.",
        "Photos, description, and listed services are your responsibility and must be yours and lawful.",
        "The platform may hide a profile or restrict an account after a terms violation or an approved report.",
        "Package subscriptions follow the approved offer. Payment proof is reviewed before activation.",
      ].join("\n\n"),
    },
    {
      code: "POLICIES_CUSTOMER",
      titleAr: "السياسات — الباحثة عن الأنوثة",
      titleEn: "Policies — Beauty seeker",
      bodyAr: [
        "نجمع بيانات الحساب اللازمة للتشغيل: الاسم، رقم الجوال، والبريد والمدينة إن أُضيفا.",
        "لا نبيع بياناتكِ. نستخدمها لتشغيل الحساب، الأمان، والدعم.",
        "المفضلة وتقييماتكِ ومشاهدات الملفات ترتبط بحسابكِ ولا تُعرض كقائمة عامة.",
        "رمز التحقق عبر الجوال لتأكيد الهوية واستعادة كلمة المرور فقط.",
        "يمكنكِ طلب إغلاق الحساب عبر الدعم. بعض السجلات التشغيلية تبقى للالتزام النظامي.",
        "التقييمات والمحتوى المرسل قد يُراجع أو يُحجب إذا خالف السياسات.",
      ].join("\n\n"),
      bodyEn: [
        "We collect account data needed to operate the service: name, mobile number, and email or city if added.",
        "We do not sell your data. We use it for account operation, security, and support.",
        "Favorites, ratings, and profile views are tied to your account and are not shown as a public list.",
        "The mobile verification code is only for identity confirmation and password reset.",
        "You may request account closure through support. Some operational records are kept for legal compliance.",
        "Submitted ratings and content may be reviewed or hidden if they violate these policies.",
      ].join("\n\n"),
    },
    {
      code: "POLICIES_PROVIDER",
      titleAr: "السياسات — صانعة الجمال",
      titleEn: "Policies — Beauty provider",
      bodyAr: [
        "نعرض للباحثات بيانات ملفكِ الظاهرة حسب إعداد الظهور: الاسم، المدينة، الخدمات، والأعمال.",
        "رقم الواتساب لا يظهر في البحث، ويُستخدم عند طلب التواصل فقط.",
        "بيانات الاشتراك والفواتير وإثباتات الدفع للاستخدام التشغيلي والمحاسبي داخل المنصة.",
        "الصور والمحتوى المرفوع يُراجع عند البلاغ أو الاعتماد، وقد يُخفى إذا خالف السياسات.",
        "لا نبيع بياناتكِ لأطراف خارج التشغيل. قد تُشارك بيانات محدودة للدعم أو الالتزام النظامي.",
        "يمكنكِ طلب إخفاء الملف أو إلغاء الحساب عبر الدعم وفق حالة الاشتراك.",
      ].join("\n\n"),
      bodyEn: [
        "We show seekers your public profile data according to visibility settings: name, city, services, and portfolio.",
        "The WhatsApp number does not appear in search and is used only when contact is requested.",
        "Subscription, invoice, and payment-proof data are used for operations and accounting on the platform.",
        "Uploaded photos and content may be reviewed on report or approval, and may be hidden if they violate policies.",
        "We do not sell your data outside operations. Limited data may be shared for support or legal compliance.",
        "You may request to hide your profile or cancel your account through support, subject to subscription status.",
      ].join("\n\n"),
    },
  ];

  for (const page of pages) {
    await prisma.legalPage.upsert({
      where: { code: page.code },
      update: {
        titleAr: page.titleAr,
        titleEn: page.titleEn,
        bodyAr: page.bodyAr,
        bodyEn: page.bodyEn,
        version: 1,
      },
      create: {
        code: page.code,
        titleAr: page.titleAr,
        titleEn: page.titleEn,
        bodyAr: page.bodyAr,
        bodyEn: page.bodyEn,
        version: 1,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
