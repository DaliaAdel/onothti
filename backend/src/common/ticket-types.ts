import type { PrismaService } from "../prisma/prisma.service";

export const TICKET_TYPE_CATALOG = [
  { code: "CU-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "CUSTOMER" },
  { code: "CU-SUGGEST", nameAr: "مقترحات", nameEn: "Suggestions", audience: "CUSTOMER" },
  { code: "BM-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "PROVIDER" },
  { code: "BM-SUGGEST", nameAr: "مقترحات", nameEn: "Suggestions", audience: "PROVIDER" },
  { code: "OP-SUPPORT", nameAr: "دعم وصيانة", nameEn: "Support and maintenance", audience: "STAFF" },
  { code: "OP-SUGGEST", nameAr: "مقترحات", nameEn: "Suggestions", audience: "STAFF" },
] as const;

const KEEP_CODES = TICKET_TYPE_CATALOG.map((item) => item.code);
const SUPPORT_BY_AUDIENCE: Record<string, string> = {
  CUSTOMER: "CU-SUPPORT",
  PROVIDER: "BM-SUPPORT",
  STAFF: "OP-SUPPORT",
};

let ensured = false;

export async function ensureTicketTypes(prisma: PrismaService): Promise<void> {
  if (ensured) {
    return;
  }
  for (const type of TICKET_TYPE_CATALOG) {
    await prisma.ticketType.upsert({
      where: { code: type.code },
      update: { nameAr: type.nameAr, nameEn: type.nameEn, audience: type.audience },
      create: { ...type },
    });
  }

  const kept = await prisma.ticketType.findMany({
    where: { code: { in: [...KEEP_CODES] } },
    select: { id: true, code: true, audience: true },
  });
  const keepIdByCode = new Map(kept.map((row) => [row.code, row.id]));
  const extras = await prisma.ticketType.findMany({
    where: { code: { notIn: [...KEEP_CODES] } },
    select: { id: true, audience: true, nameAr: true },
  });
  for (const extra of extras) {
    const suggest =
      extra.nameAr === "مقترحات"
        ? keepIdByCode.get(
            extra.audience === "CUSTOMER" ? "CU-SUGGEST" : extra.audience === "PROVIDER" ? "BM-SUGGEST" : "OP-SUGGEST",
          )
        : null;
    const fallback =
      suggest ||
      keepIdByCode.get(SUPPORT_BY_AUDIENCE[extra.audience] || "OP-SUPPORT") ||
      keepIdByCode.get("OP-SUPPORT");
    if (fallback) {
      await prisma.ticket.updateMany({
        where: { typeId: extra.id },
        data: { typeId: fallback },
      });
    }
    await prisma.ticketType.delete({ where: { id: extra.id } });
  }
  ensured = true;
}
