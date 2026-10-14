import { PrismaService } from "../prisma/prisma.service";
import { AccountStatus, AccountType, NotificationType } from "./enums";
import { effectivePermissionCodes } from "./staff-permissions";

export async function notifyOncePerDay(
  prisma: PrismaService,
  input: {
    userId: string;
    type: string;
    ref?: string;
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
  },
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const existing = await prisma.notification.findFirst({
    where: {
      userId: input.userId,
      type: input.type,
      ref: input.ref ?? null,
      createdAt: { gte: start },
    },
  });
  if (existing) {
    return existing;
  }
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      ref: input.ref,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      bodyAr: input.bodyAr,
      bodyEn: input.bodyEn,
      status: "SENT",
    },
  });
}

export async function notifyProfileView(
  prisma: PrismaService,
  providerUserId: string,
  customerUserId?: string,
  customerName?: string,
) {
  if (!customerUserId || customerUserId === providerUserId) {
    return;
  }
  const name = customerName?.trim() || "باحثة";
  return notifyOncePerDay(prisma, {
    userId: providerUserId,
    type: NotificationType.PROFILE_VIEW,
    ref: customerUserId,
    titleAr: "فتح ملفكِ",
    titleEn: "Profile opened",
    bodyAr: `${name} فتحت ملفكِ اليوم`,
    bodyEn: `${name} opened your profile today`,
  });
}

export async function notifyContact(
  prisma: PrismaService,
  providerUserId: string,
  customerUserId?: string,
  customerName?: string,
) {
  const name = customerName?.trim() || (customerUserId ? "باحثة" : "زائرة");
  return notifyOncePerDay(prisma, {
    userId: providerUserId,
    type: NotificationType.CONTACT,
    ref: customerUserId ?? "guest",
    titleAr: "تواصل واتساب",
    titleEn: "WhatsApp contact",
    bodyAr: `${name} طلبت التواصل معكِ عبر واتساب`,
    bodyEn: `${name} requested WhatsApp contact`,
  });
}

export async function notifyStaffWithPermission(
  prisma: PrismaService,
  codes: string[],
  titleAr: string,
  bodyAr: string,
  ref: string,
  exceptUserId?: string,
) {
  const staff = await prisma.staffUser.findMany({
    where: { user: { status: AccountStatus.ACTIVE, accountType: AccountType.STAFF } },
    include: {
      grants: { include: { permission: true } },
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  const userIds = [
    ...new Set(
      staff
        .filter((row) => effectivePermissionCodes(row).codes.some((code) => codes.includes(code)))
        .map((row) => row.userId),
    ),
  ].filter((id) => id !== exceptUserId);
  if (!userIds.length) {
    return;
  }
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      audience: AccountType.STAFF,
      type: "SYSTEM",
      ref,
      titleAr,
      titleEn: titleAr,
      bodyAr,
      bodyEn: bodyAr,
      status: "SENT",
    })),
  });
}
