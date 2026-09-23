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
  portfolio?: { id: string; storageKey: string; kind: string; url?: string | null }[];
}

export interface SearchResponse {
  items: ProviderCard[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FavoriteRow {
  id?: string;
  targetType: 'PROVIDER' | 'SERVICE';
  targetId: string;
  item?: { id: string; displayName?: string; nameAr?: string; nameEn?: string } | null;
}

export interface FavoriteList {
  provider: FavoriteRow[];
  service: FavoriteRow[];
}

export interface CatalogPackage {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  rank: number;
  price?: number | string;
  durationMonths?: number;
  maxServices?: number | null;
  maxPhotos?: number | null;
  maxVideos?: number | null;
  monthlyPrice?: number | string;
}

export interface NamedCity {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface ProviderMe {
  id: string;
  displayName: string;
  mobile?: string;
  email?: string | null;
  accountCode: string;
  status: string;
  visibility: string;
  bio?: string | null;
  whatsapp?: string | null;
  badge?: string | null;
  city?: NamedCity | null;
  avatarUrl?: string | null;
}

export interface ProviderDashboard {
  profile: ProviderMe;
  stats: {
    views30d: number;
    ratingAvg: number | null;
    ratingCount: number;
    photosApproved: number;
    photosPending: number;
    servicesCount: number;
    completionPercent: number;
  };
  subscription: ProviderSubscription | null;
}

export interface ProviderSubscription {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  package: CatalogPackage;
}

export interface ProviderServiceRow {
  id: string;
  serviceId: string;
  subServiceId?: string | null;
  service: CatalogService;
  subService?: { id: string; nameAr: string; nameEn: string } | null;
}

export interface ProviderPortfolioItem {
  id: string;
  approvalStatus: string;
  storageKey: string;
  kind: string;
  status?: string;
  url?: string | null;
}

export interface ProviderReviews {
  ratingAvg: number | null;
  ratingCount: number;
  items: { id: string; stars: number; note?: string | null; status: string; createdAt: string }[];
}

export interface ProviderViews {
  total: number;
  items: { date: string; viewCount: number; city?: NamedCity | null }[];
}

export interface BankAccount {
  id: string;
  bankName: string;
  iban: string;
  accountName: string;
}

export interface PaymentProof {
  id: string;
  amount: number;
  opsStatus: string;
  financeStatus: string;
  createdAt: string;
  file: { kind: string; storageKey: string; mime: string };
  subscription: { id: string; status: string; package: CatalogPackage };
}

export interface ProviderSubscriptionResponse {
  current: ProviderSubscription | null;
  packages: CatalogPackage[];
  bankAccounts: BankAccount[];
  proofs: PaymentProof[];
}

export interface TicketType {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

export interface ProviderTicket {
  id: string;
  refNo: string;
  status: string;
  body: string;
  createdAt: string;
  type: TicketType;
}

export const FALLBACK_SERVICES = [
  { id: 'hair', code: 'hair', nameAr: 'خبيرة الشعر', nameEn: 'Hair', desc: 'قص، تسريحات وعلاجات متخصصة', descEn: 'Cuts, styling, and specialist treatments' },
  { id: 'makeup', code: 'makeup', nameAr: 'خبيرة مكياج', nameEn: 'Makeup', desc: 'إطلالات يومية ومناسبات وعرائس', descEn: 'Everyday, occasion, and bridal looks' },
  { id: 'microblading', code: 'microblading', nameAr: 'المايكروبليدنج', nameEn: 'Microblading', desc: 'تحديد طبيعي ودقيق للحواجب', descEn: 'Natural, precise brow definition' },
  { id: 'nails', code: 'nails', nameAr: 'خبيرة الأظافر', nameEn: 'Nails', desc: 'عناية وتصاميم أظافر متقنة', descEn: 'Care and detailed nail designs' },
  { id: 'henna', code: 'henna', nameAr: 'حناء ونقش', nameEn: 'Henna', desc: 'نقوش عصرية وتراثية أنيقة', descEn: 'Modern and traditional henna designs' },
  { id: 'skincare', code: 'skincare', nameAr: 'العناية بالبشرة', nameEn: 'Skincare', desc: 'جلسات عناية تناسب احتياج بشرتك', descEn: 'Care sessions tailored to your skin' },
  { id: 'bodycare', code: 'bodycare', nameAr: 'العناية بالجسم', nameEn: 'Bodycare', desc: 'جلسات استرخاء وعناية متخصصة', descEn: 'Relaxation and specialist body care' },
  { id: 'dj', code: 'dj', nameAr: 'منسقة موسيقى (دي جي)', nameEn: 'DJ', desc: 'تنسيق موسيقى المناسبات', descEn: 'Music for occasions' },
  { id: 'events', code: 'events', nameAr: 'منسقة الحفلات', nameEn: 'Events', desc: 'تنظيم تفاصيل الحفلات والمناسبات', descEn: 'Planning the details of parties and events' },
  { id: 'dresses', code: 'dresses', nameAr: 'فساتين الأعراس', nameEn: 'Dresses', desc: 'خيارات فساتين للعرائس والمناسبات', descEn: 'Dresses for brides and occasions' },
  { id: 'photographers', code: 'photographers', nameAr: 'المصورات', nameEn: 'Photographers', desc: 'تصوير المناسبات والجلسات الخاصة', descEn: 'Photography for events and private sessions' },
  { id: 'model', code: 'model', nameAr: 'المودل', nameEn: 'Model', desc: 'عارضات للأعمال والجلسات الإبداعية', descEn: 'Models for campaigns and creative sessions' },
  { id: 'drinks', code: 'drinks', nameAr: 'ركن المشروبات', nameEn: 'Drinks', desc: 'تجهيز وتنسيق ركن المشروبات', descEn: 'Setting up and styling a drinks corner' },
  { id: 'piercing', code: 'piercing', nameAr: 'التخريم (Piercing)', nameEn: 'Piercing', desc: 'خدمات تخريم احترافية', descEn: 'Professional piercing services' },
];
