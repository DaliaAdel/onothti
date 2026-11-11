const ARABIC = /[\u0600-\u06FF]/;

const EXACT: Record<string, string> = {
  'أُعيد التعديل للمراجعة': 'Change sent back for review',
  'تم اعتماد تعديل الملف': 'Profile change approved',
  'تم رفض تعديل الملف': 'Profile change rejected',
  'تم إغلاق البلاغ': 'Report closed',
  'تم تصعيد البلاغ': 'Report escalated',
  'تحديث البلاغ': 'Report update',
  'تم إغلاق بلاغ مرتبط بحسابك': 'A report linked to your account was closed',
  'أُعيد تقييم للمراجعة': 'Rating sent back for review',
  'أُعيد تقييمك للمراجعة': 'Your rating was sent back for review',
  'تم اعتماد تقييم جديد': 'New rating approved',
  'رُفض تقييم على ملفك': 'A rating on your profile was rejected',
  'تم نشر تقييمك': 'Your rating is live',
  'لم يُعتمد تقييمك': 'Your rating was not approved',
  'تم إغلاق طلبك': 'Your request was closed',
  'تحديث على طلبك': 'Update on your request',
  'رد على طلبك': 'Reply to your request',
  'تحديث الحساب': 'Account update',
  'أُعيد الملف للمراجعة': 'File sent back for review',
  'طلب صورة أوضح': 'Clearer image requested',
  'تم اعتماد الملف': 'File approved',
  'تم رفض الملف': 'File rejected',
  'أُعيد الحساب للمراجعة': 'Account sent back for review',
  'تم اعتماد الحساب': 'Account approved',
  'تم إيقاف الحساب': 'Account suspended',
  'فتح ملفكِ': 'Profile opened',
  'تواصل واتساب': 'WhatsApp contact',
  'إعادة تقييم للمراجعة': 'Rating returned for review',
  'اعتماد تقييم': 'Rating approved',
  'رفض تقييم': 'Rating rejected',
  'تحويل إيصال للمالية': 'Receipt forwarded to finance',
  'إعادة حساب خبيرة للمراجعة': 'Provider account returned for review',
  'اعتماد حساب خبيرة': 'Provider account approved',
  'إيقاف حساب خبيرة': 'Provider account suspended',
  'عمل جديد بانتظار الاعتماد': 'New work awaiting approval',
  'إيصال تحويل جديد': 'New transfer receipt',
  'طلب جديد من خبيرة': 'New provider request',
  'طلب جديد من عميلة': 'New customer request',
  'بلاغ جديد': 'New report',
  'طلب اعتماد جديد': 'New approval request',
  'تقييم بانتظار الاعتماد': 'Rating awaiting approval',
  'سيُراجع المشغّل التعديل مرة أخرى': 'Operations will review the change again',
  'اعتمد المشغّل التعديل على ملفك': 'Operations approved the change on your profile',
  'لم يُعتمد التعديل المطلوب على الملف': 'The requested profile change was not approved',
  'سيُراجع التقييم مرة أخرى': 'The rating will be reviewed again',
  'ظهر تقييم جديد بعد المراجعة': 'A new rating is live after review',
  'لم يُعتمد التقييم': 'The rating was not approved',
  'سيظهر تقييمك في ملف الخبيرة': 'Your rating will appear on the provider profile',
  'المراجعة لم تعتمد التقييم': 'Review did not approve the rating',
  'الطلب قيد المعالجة': 'Request in progress',
  'تم حل الطلب': 'Request resolved',
  'تم إغلاق الطلب': 'Request closed',
  'الطلب بانتظار المراجعة': 'Request pending review',
  'سيُراجع المشغّل الملف مرة أخرى': 'Operations will review the file again',
  'يرجى رفع إثبات أوضح للمراجعة': 'Please upload a clearer proof for review',
  'اعتمد المشغّل الملف المرفوع': 'Operations approved the uploaded file',
  'رفض المشغّل الملف المرفوع': 'Operations rejected the uploaded file',
  'سيُراجع المشغّل الحساب مرة أخرى': 'Operations will review the account again',
  'اعتمد المشغّل ملف الخبيرة': 'Operations approved the provider profile',
  'لم يُعتمد ملف الخبيرة': 'The provider profile was not approved',
};

const FIELDS: Record<string, string> = {
  'اسم العرض': 'display name',
  'صورة العرض': 'profile photo',
  'تعديل الملف': 'profile change',
  'عمل من المعرض': 'portfolio item',
  'حساب خبيرة': 'provider account',
  'النبذة': 'bio',
  'إيصال': 'receipt',
  'تقييم': 'rating',
  'الاسم': 'name',
  'البريد': 'email',
  'المدينة': 'city',
  'واتساب': 'WhatsApp',
  'ملف': 'file',
};

const TOKENS: [string, string][] = [
  ['موظفة التشغيل', 'Operations staff'],
  ['طلبت صورة أوضح لإيصال', 'requested a clearer image for the receipt of'],
  ['أضافت فيديو للألبوم', 'added a video to the album'],
  ['أضافت صورة للألبوم', 'added a photo to the album'],
  ['أعادت تقييم', 'returned a rating by'],
  ['اعتمدت تقييم', 'approved a rating by'],
  ['رفضت تقييم', 'rejected a rating by'],
  ['أعادت حساب', 'returned the account of'],
  ['اعتمدت حساب', 'approved the account of'],
  ['أوقفت حساب', 'suspended the account of'],
  ['حوّلت إيصال', 'forwarded a receipt for'],
  ['رفعت إيصال', 'uploaded a receipt for'],
  ['على حساب', 'on'],
  ['للمراجعة', 'for review'],
  ['لحساب', 'for'],
  ['بقيمة', 'amounting to'],
  ['الحالة:', 'Status:'],
  ['الباقة:', 'Package:'],
  ['أعادت', 'returned'],
  ['اعتمدت', 'approved'],
  ['رفضت', 'rejected'],
  ['أوقفت', 'suspended'],
  ['أضافت', 'added'],
  ['حدّثت', 'updated'],
  ['قيّمت', 'rated'],
  ['الخبيرة', 'Provider'],
  ['العميلة', 'Customer'],
  ['باحثة', 'a customer'],
  ['زائرة', 'a visitor'],
  ['دعم وصيانة', 'Support and maintenance'],
  ['مقترحات', 'Suggestions'],
  ['فتحت ملفكِ اليوم', 'opened your profile today'],
  ['طلبت التواصل معكِ عبر واتساب', 'requested WhatsApp contact'],
  [' ر.س', ' SAR'],
  ['نجوم', 'stars'],
  ['ضد', 'against'],
  ['بـ', 'with'],
  ['نشط', 'Active'],
  ['مقيّد', 'Restricted'],
  ['موقوف', 'Suspended'],
  ['ملغى', 'Cancelled'],
  ['محذوف', 'Deleted'],
];

const TITLE_PATTERNS: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^إعادة (.+) للمراجعة$/, (match) => `Returned ${fieldEn(match[1])} for review`],
  [/^اعتماد (.+)$/, (match) => `Approved ${fieldEn(match[1])}`],
  [/^رفض (.+)$/, (match) => `Rejected ${fieldEn(match[1])}`],
  [/^إيقاف (.+)$/, (match) => `Suspended ${fieldEn(match[1])}`],
];

function fieldEn(value: string): string {
  return FIELDS[value] || notifyCopyEn(value);
}

function replaceTokens(value: string): string {
  let out = value;
  for (const [ar, en] of TOKENS) {
    if (out.includes(ar)) {
      out = out.split(ar).join(en);
    }
  }
  for (const [ar, en] of Object.entries(FIELDS)) {
    if (out.includes(ar)) {
      out = out.split(ar).join(en);
    }
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

export function hasArabic(text?: string | null): boolean {
  return !!text && ARABIC.test(text);
}

export function notifyCopyEn(text?: string | null): string {
  const value = (text ?? '').trim();
  if (!value) {
    return '';
  }
  if (!ARABIC.test(value)) {
    return value;
  }
  const exact = EXACT[value];
  if (exact) {
    return exact;
  }
  for (const [pattern, to] of TITLE_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      return to(match);
    }
  }
  const translated = replaceTokens(value);
  return translated;
}
