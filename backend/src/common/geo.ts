import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const CITY_INCLUDE = {
  region: { select: { id: true, code: true, nameAr: true, nameEn: true, isVisible: true } },
} as const;

export type GeoCity = {
  id: string;
  regionId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isVisible: boolean;
  region: { id: string; code: string; nameAr: string; nameEn: string; isVisible: boolean };
};

export function uniqueCityIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function parseCityIds(value?: string | null): string[] {
  if (!value?.trim()) {
    return [];
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as { cityIds?: string[] } | string[];
      if (Array.isArray(parsed)) {
        return uniqueCityIds(parsed);
      }
      if (Array.isArray(parsed.cityIds)) {
        return uniqueCityIds(parsed.cityIds);
      }
    } catch {
      return [];
    }
  }
  return uniqueCityIds(trimmed.split(","));
}

export function serializeCityIds(cityIds: string[]) {
  return JSON.stringify({ cityIds: uniqueCityIds(cityIds) });
}

export function resolveCityIds(cityId?: string, cityIds?: string[]) {
  const ids = uniqueCityIds(cityIds?.length ? cityIds : cityId ? [cityId] : []);
  if (cityId && ids.length && ids[0] !== cityId) {
    return [cityId, ...ids.filter((id) => id !== cityId)];
  }
  return ids;
}

export function geoPayload(primary: GeoCity | null | undefined, cities: GeoCity[]) {
  const ordered = cities.length ? cities : primary ? [primary] : [];
  const city = ordered[0] ?? primary ?? null;
  return {
    city,
    cities: ordered,
    region: city?.region ?? null,
  };
}

export async function assertVisibleCitiesInSameRegion(prisma: PrismaService, cityIds: string[]) {
  const ids = uniqueCityIds(cityIds);
  if (!ids.length) {
    throw new BadRequestException("اختاري مدينة واحدة على الأقل");
  }
  if (ids.length > 20) {
    throw new BadRequestException("الحد الأقصى 20 مدينة للحساب");
  }
  const cities = await prisma.city.findMany({
    where: { id: { in: ids }, isVisible: true },
    include: CITY_INCLUDE,
  });
  if (cities.length !== ids.length) {
    throw new BadRequestException("إحدى المدن غير متاحة");
  }
  const regionIds = new Set(cities.map((city) => city.regionId));
  if (regionIds.size > 1) {
    throw new BadRequestException("المدن لازم تكون تابعة لنفس المنطقة");
  }
  const byId = new Map(cities.map((city) => [city.id, city]));
  return ids.map((id) => byId.get(id)!);
}

export async function replaceCustomerCities(
  prisma: PrismaService,
  userId: string,
  cityIds: string[],
) {
  const cities = await assertVisibleCitiesInSameRegion(prisma, cityIds);
  await prisma.$transaction([
    prisma.customerCity.deleteMany({ where: { customerUserId: userId } }),
    prisma.customerCity.createMany({
      data: cities.map((city, sortOrder) => ({
        customerUserId: userId,
        cityId: city.id,
        sortOrder,
      })),
    }),
    prisma.customerProfile.update({
      where: { userId },
      data: { cityId: cities[0].id },
    }),
  ]);
  return cities;
}

export async function replaceProviderCities(
  prisma: PrismaService,
  userId: string,
  cityIds: string[],
) {
  const cities = await assertVisibleCitiesInSameRegion(prisma, cityIds);
  await prisma.$transaction([
    prisma.providerCity.deleteMany({ where: { providerUserId: userId } }),
    prisma.providerCity.createMany({
      data: cities.map((city, sortOrder) => ({
        providerUserId: userId,
        cityId: city.id,
        sortOrder,
      })),
    }),
    prisma.providerProfile.update({
      where: { userId },
      data: { cityId: cities[0].id },
    }),
  ]);
  return cities;
}

export function orderedCitiesFromRows(
  rows: { city: GeoCity; sortOrder: number }[],
  fallback?: GeoCity | null,
) {
  const cities = [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => row.city);
  return geoPayload(fallback ?? null, cities);
}
