import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AccountStatus, AccountType, ProfileChangeField, StaffPermission, Visibility } from "./enums";
import { notifyStaffWithPermission } from "./notify";
import { idleCutoffFor } from "./platform-settings";

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value?: string | null) {
  const email = value?.trim().toLowerCase();
  return email ? email : null;
}

export async function assertUniqueDisplayName(
  prisma: PrismaService,
  accountType: string,
  displayName: string,
  excludeUserId?: string,
) {
  const name = normalizeDisplayName(displayName);
  if (name.length < 2) {
    throw new BadRequestException("اسم العرض قصير");
  }
  const taken = await prisma.user.findFirst({
    where: {
      accountType,
      displayName: name,
      status: { not: AccountStatus.DELETED },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
  if (taken) {
    throw new ConflictException("اسم العرض مستخدم لهذا النوع من الحساب");
  }
  const pending = await prisma.profileChangeRequest.findFirst({
    where: {
      field: ProfileChangeField.DISPLAY_NAME,
      status: "PENDING",
      newValue: name,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      user: { accountType },
    },
  });
  if (pending) {
    throw new ConflictException("اسم العرض مستخدم لهذا النوع من الحساب");
  }
  return name;
}

export async function assertUniqueEmail(
  prisma: PrismaService,
  email?: string | null,
  excludeUserId?: string,
) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return null;
  }
  const taken = await prisma.user.findFirst({
    where: {
      email: normalized,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
  if (taken) {
    throw new ConflictException("البريد الإلكتروني مسجل بالفعل");
  }
  return normalized;
}

export async function queueProfileChange(
  prisma: PrismaService,
  userId: string,
  field: string,
  oldValue: string | null | undefined,
  newValue: string,
) {
  const next = newValue.trim();
  const previous = (oldValue ?? "").trim();
  if (next === previous) {
    return null;
  }
  const existing = await prisma.profileChangeRequest.findFirst({
    where: { userId, field, status: "PENDING" },
  });
  if (existing) {
    return prisma.profileChangeRequest.update({
      where: { id: existing.id },
      data: { newValue: next, oldValue: previous || existing.oldValue },
    });
  }
  const created = await prisma.profileChangeRequest.create({
    data: {
      userId,
      field,
      oldValue: previous || null,
      newValue: next,
    },
  });
  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, accountCode: true, accountType: true },
  });
  if (owner) {
    const who = owner.accountType === AccountType.PROVIDER ? "الخبيرة" : "العميلة";
    const labels: Record<string, string> = {
      DISPLAY_NAME: "الاسم",
      BIO: "النبذة",
      AVATAR: "الصورة",
      EMAIL: "البريد",
      CITY: "المدينة",
      WHATSAPP: "واتساب",
    };
    await notifyStaffWithPermission(
      prisma,
      [StaffPermission.RATINGS_REVIEW],
      "طلب اعتماد جديد",
      `${who} ${owner.displayName} (${owner.accountCode}) حدّثت ${labels[field] || field}`,
      `change:${created.id}`,
    );
  }
  return created;
}

export async function pendingChangesFor(prisma: PrismaService, userId: string) {
  return prisma.profileChangeRequest.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

export function pendingValue(
  changes: { field: string; newValue: string }[],
  field: string,
) {
  return changes.find((item) => item.field === field)?.newValue;
}

export function campaignEndOfDay(value: Date) {
  const end = new Date(value);
  end.setHours(23, 59, 59, 0);
  return end;
}

export function campaignSubscriptionEndAt(
  campaign: { endDate: Date; benefitDays: number; clipToEndDate: boolean },
  startAt = new Date(),
) {
  const byDays = new Date(startAt.getTime());
  byDays.setDate(byDays.getDate() + campaign.benefitDays);
  if (!campaign.clipToEndDate) {
    return byDays;
  }
  const campaignEnd = campaignEndOfDay(new Date(campaign.endDate));
  const endAt = byDays.getTime() < campaignEnd.getTime() ? byDays : campaignEnd;
  if (endAt.getTime() <= startAt.getTime()) {
    return null;
  }
  return endAt;
}

export async function liveCampaign(prisma: PrismaService, packageId?: string) {
  const now = new Date();
  return prisma.campaign.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      ...(packageId ? { packageId } : {}),
    },
    include: { package: { select: { id: true, code: true, nameAr: true, nameEn: true, price: true } } },
    orderBy: { startDate: "desc" },
  });
}

export async function refreshExpiredProviders(prisma: PrismaService) {
  const now = new Date();
  const idleCutoff = await idleCutoffFor(prisma, "provider");

  const expired = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      endAt: { lt: now },
    },
    select: { id: true, providerUserId: true, endAt: true },
  });
  if (!expired.length) {
    return;
  }

  await prisma.subscription.updateMany({
    where: { id: { in: expired.map((item) => item.id) } },
    data: { status: "EXPIRED" },
  });

  const stillActive = await prisma.subscription.findMany({
    where: {
      providerUserId: { in: expired.map((item) => item.providerUserId) },
      status: "ACTIVE",
      endAt: { gte: now },
    },
    select: { providerUserId: true },
  });
  const stillActiveIds = new Set(stillActive.map((item) => item.providerUserId));

  for (const row of expired) {
    if (stillActiveIds.has(row.providerUserId)) {
      continue;
    }
    const visibility = row.endAt >= idleCutoff ? Visibility.LIMITED : Visibility.HIDDEN;
    await prisma.user.update({
      where: { id: row.providerUserId },
      data: {
        status: AccountStatus.RESTRICTED,
        providerProfile: { update: { visibility } },
        statusHistory: {
          create: {
            fromStatus: AccountStatus.ACTIVE,
            toStatus: AccountStatus.RESTRICTED,
            reason: visibility === Visibility.LIMITED ? "subscription-idle" : "subscription-hidden",
          },
        },
      },
    });
  }
}

export function canContactProvider(input: {
  status: string;
  visibility?: string | null;
  allowWhatsApp?: boolean | null;
  hasLiveSubscription: boolean;
}) {
  return (
    input.status === AccountStatus.ACTIVE &&
    input.visibility === Visibility.PUBLIC &&
    Boolean(input.allowWhatsApp) &&
    input.hasLiveSubscription
  );
}

export function providerSearchWhere(): Prisma.UserWhereInput {
  return {
    accountType: AccountType.PROVIDER,
    OR: [
      { status: AccountStatus.ACTIVE, providerProfile: { visibility: Visibility.PUBLIC } },
      { status: AccountStatus.RESTRICTED, providerProfile: { visibility: Visibility.LIMITED } },
    ],
  };
}
