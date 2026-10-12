export function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function moneyOf(value: { toString(): string } | number | string | null | undefined, fallback = 0) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

export function clampDiscount(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(100, value);
}

export function priceAfterDiscount(priceBefore: number, discountPercent: number) {
  const before = Math.max(0, moneyOf(priceBefore));
  const percent = clampDiscount(discountPercent);
  return roundMoney(before * (1 - percent / 100));
}

export function resolvePackagePricing(input: {
  priceBefore?: number;
  discountPercent?: number;
  price?: number;
  current?: { priceBefore?: { toString(): string } | number; discountPercent?: { toString(): string } | number; price?: { toString(): string } | number };
}) {
  const currentBefore = moneyOf(input.current?.priceBefore, moneyOf(input.current?.price));
  const priceBefore = moneyOf(input.priceBefore, moneyOf(input.price, currentBefore));
  const discountPercent = clampDiscount(moneyOf(input.discountPercent, moneyOf(input.current?.discountPercent)));
  return {
    priceBefore: roundMoney(Math.max(0, priceBefore)),
    discountPercent: roundMoney(discountPercent),
    price: priceAfterDiscount(priceBefore, discountPercent),
  };
}

export function serializePackage(pkg: {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  durationMonths: number;
  price: { toString(): string } | number;
  priceBefore?: { toString(): string } | number;
  discountPercent?: { toString(): string } | number;
  vatPercent?: { toString(): string } | number;
  rank: number;
  maxServices: number | null;
  maxPhotos: number | null;
  maxVideos: number | null;
  maxAlbums?: number | null;
  allowWhatsApp?: boolean;
  allowRating?: boolean;
  hasBadge?: boolean;
  isActive?: boolean;
}) {
  const pricing = resolvePackagePricing({
    price: moneyOf(pkg.price),
    priceBefore: pkg.priceBefore !== undefined ? moneyOf(pkg.priceBefore) : undefined,
    discountPercent: pkg.discountPercent !== undefined ? moneyOf(pkg.discountPercent) : undefined,
  });
  return {
    id: pkg.id,
    code: pkg.code,
    nameAr: pkg.nameAr,
    nameEn: pkg.nameEn,
    durationMonths: pkg.durationMonths,
    priceBefore: pricing.priceBefore,
    discountPercent: pricing.discountPercent,
    price: moneyOf(pkg.price, pricing.price),
    vatPercent: pkg.vatPercent !== undefined ? moneyOf(pkg.vatPercent) : undefined,
    rank: pkg.rank,
    maxServices: pkg.maxServices,
    maxPhotos: pkg.maxPhotos,
    maxVideos: pkg.maxVideos,
    maxAlbums: pkg.maxAlbums ?? null,
    allowWhatsApp: pkg.allowWhatsApp ?? true,
    allowRating: pkg.allowRating ?? true,
    hasBadge: pkg.hasBadge ?? false,
    isActive: pkg.isActive ?? true,
  };
}
