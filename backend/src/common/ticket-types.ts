import type { PrismaService } from "../prisma/prisma.service";

export const TICKET_TYPE_CATALOG = [
  { code: "CU-01", nameAr: "مشكلة تقنية", nameEn: "Technical issue", audience: "CUSTOMER" },
  { code: "CU-02", nameAr: "استفسار عام", nameEn: "General inquiry", audience: "CUSTOMER" },
  { code: "CU-03", nameAr: "شكوى على صانعة جمال", nameEn: "Complaint about a beauty provider", audience: "CUSTOMER" },
  { code: "CU-04", nameAr: "بلاغ عن حساب أو محتوى", nameEn: "Report an account or content", audience: "CUSTOMER" },
  { code: "CU-05", nameAr: "تقديم تقييم", nameEn: "Submit a rating", audience: "CUSTOMER" },
  { code: "CU-06", nameAr: "اعتراض أو متابعة تقييم", nameEn: "Rating objection or follow-up", audience: "CUSTOMER" },
  { code: "CU-07", nameAr: "تعديل بيانات خاضعة للمراجعة", nameEn: "Profile change pending review", audience: "CUSTOMER" },
  { code: "CU-08", nameAr: "مقترحات", nameEn: "Suggestions", audience: "CUSTOMER" },
  { code: "CU-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "CUSTOMER" },
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
  { code: "BM-13", nameAr: "مقترحات", nameEn: "Suggestions", audience: "PROVIDER" },
  { code: "BM-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "PROVIDER" },
  { code: "BM-14", nameAr: "طلب إلغاء أو حذف الحساب", nameEn: "Account cancellation or deletion", audience: "PROVIDER" },
  { code: "OP-01", nameAr: "طلب تحقق مالي", nameEn: "Finance verification request", audience: "STAFF" },
  { code: "OP-02", nameAr: "طلب دعم تقني", nameEn: "Technical support request", audience: "STAFF" },
  { code: "OP-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "STAFF" },
  { code: "OP-SUGGEST", nameAr: "مقترحات", nameEn: "Suggestions", audience: "STAFF" },
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
] as const;

let ensured = false;

export async function ensureTicketTypes(prisma: PrismaService): Promise<void> {
  if (ensured) {
    return;
  }
  const needed = TICKET_TYPE_CATALOG.length;
  const count = await prisma.ticketType.count({
    where: { code: { in: TICKET_TYPE_CATALOG.map((item) => item.code) } },
  });
  if (count >= needed) {
    ensured = true;
    return;
  }
  for (const type of TICKET_TYPE_CATALOG) {
    await prisma.ticketType.upsert({
      where: { code: type.code },
      update: { nameAr: type.nameAr, nameEn: type.nameEn, audience: type.audience },
      create: { ...type },
    });
  }
  ensured = true;
}
