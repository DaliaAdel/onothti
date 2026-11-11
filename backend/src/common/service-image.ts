import { publicUploadUrl } from "./upload-url";
import type { PrismaService } from "../prisma/prisma.service";

export async function serviceImageUrlMap(prisma: PrismaService, ids: Array<string | null | undefined>) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const map = new Map<string, string | null>();
  if (!unique.length) {
    return map;
  }
  const files = await prisma.mediaFile.findMany({
    where: { id: { in: unique } },
    select: { id: true, storageKey: true },
  });
  for (const file of files) {
    map.set(file.id, publicUploadUrl(file.storageKey));
  }
  return map;
}

export async function withServiceImageUrl<T extends { imageFileId?: string | null; iconFileId?: string | null }>(
  prisma: PrismaService,
  row: T,
): Promise<T & { imageUrl: string | null; iconUrl: string | null }> {
  const [mapped] = await withServiceImageUrls(prisma, [row]);
  return mapped;
}

export async function withServiceImageUrls<T extends { imageFileId?: string | null; iconFileId?: string | null }>(
  prisma: PrismaService,
  rows: T[],
): Promise<Array<T & { imageUrl: string | null; iconUrl: string | null }>> {
  const map = await serviceImageUrlMap(
    prisma,
    rows.flatMap((row) => [row.imageFileId, row.iconFileId]),
  );
  return rows.map((row) => ({
    ...row,
    imageUrl: row.imageFileId ? map.get(row.imageFileId) ?? null : null,
    iconUrl: row.iconFileId ? map.get(row.iconFileId) ?? null : null,
  }));
}
