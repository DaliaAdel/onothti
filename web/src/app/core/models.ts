export type AccountType = 'CUSTOMER' | 'PROVIDER';

export interface SessionUser {
  id: string;
  accountType: AccountType;
  status: string;
  displayName: string;
  accountCode: string;
  visible?: boolean;
  mobile?: string;
  email?: string;
  city?: { id: string; nameAr: string; nameEn: string } | null;
}

export interface AuthResponse {
  accessToken: string;
  user: SessionUser;
}

export interface SignupDraft {
  displayName: string;
  mobile: string;
  email?: string;
  password: string;
  accountType?: AccountType;
  cityId?: string;
  bio?: string;
}

export interface CatalogCity {
  id: string;
  nameAr: string;
  nameEn: string;
  region?: { nameAr: string; nameEn: string };
}

export interface CatalogService {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  sortOrder?: number;
  subServices?: { id: string; nameAr: string; nameEn: string }[];
}

export interface ProviderCard {
  id: string;
  displayName: string;
  city?: { id: string; nameAr: string; nameEn: string } | null;
  badge?: string | null;
  packageCode?: string;
  services?: { nameAr: string; nameEn: string; serviceCode: string }[];
  ratingAvg?: number | null;
  ratingCount?: number;
  canContact?: boolean;
}

export interface ProviderProfile extends ProviderCard {
  bio?: string | null;
  ratings?: { stars: number; note?: string | null; createdAt: string }[];
  portfolio?: { id: string; storageKey: string; kind: string }[];
}

export interface SearchResponse {
  items: ProviderCard[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CatalogPackage {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  rank: number;
  monthlyPrice?: number | string;
}

export const FALLBACK_SERVICES = [
  { id: 'hair', code: 'hair', nameAr: 'خبيرة الشعر', nameEn: 'Hair', desc: 'قص، تسريحات وعلاجات متخصصة' },
  { id: 'makeup', code: 'makeup', nameAr: 'خبيرة مكياج', nameEn: 'Makeup', desc: 'إطلالات يومية ومناسبات وعرائس' },
  { id: 'microblading', code: 'microblading', nameAr: 'المايكروبليدنج', nameEn: 'Microblading', desc: 'تحديد طبيعي ودقيق للحواجب' },
  { id: 'nails', code: 'nails', nameAr: 'خبيرة الأظافر', nameEn: 'Nails', desc: 'عناية وتصاميم أظافر متقنة' },
  { id: 'henna', code: 'henna', nameAr: 'حناء ونقش', nameEn: 'Henna', desc: 'نقوش عصرية وتراثية أنيقة' },
  { id: 'skincare', code: 'skincare', nameAr: 'العناية بالبشرة', nameEn: 'Skincare', desc: 'جلسات عناية تناسب احتياج بشرتك' },
  { id: 'bodycare', code: 'bodycare', nameAr: 'العناية بالجسم', nameEn: 'Bodycare', desc: 'جلسات استرخاء وعناية متخصصة' },
  { id: 'dj', code: 'dj', nameAr: 'منسقة موسيقى (دي جي)', nameEn: 'DJ', desc: 'تنسيق موسيقى المناسبات' },
  { id: 'events', code: 'events', nameAr: 'منسقة الحفلات', nameEn: 'Events', desc: 'تنظيم تفاصيل الحفلات والمناسبات' },
  { id: 'dresses', code: 'dresses', nameAr: 'فساتين الأعراس', nameEn: 'Dresses', desc: 'خيارات فساتين للعرائس والمناسبات' },
  { id: 'photographers', code: 'photographers', nameAr: 'المصورات', nameEn: 'Photographers', desc: 'تصوير المناسبات والجلسات الخاصة' },
  { id: 'model', code: 'model', nameAr: 'المودل', nameEn: 'Model', desc: 'عارضات للأعمال والجلسات الإبداعية' },
  { id: 'drinks', code: 'drinks', nameAr: 'ركن المشروبات', nameEn: 'Drinks', desc: 'تجهيز وتنسيق ركن المشروبات' },
  { id: 'piercing', code: 'piercing', nameAr: 'التخريم (Piercing)', nameEn: 'Piercing', desc: 'خدمات تخريم احترافية' },
];
