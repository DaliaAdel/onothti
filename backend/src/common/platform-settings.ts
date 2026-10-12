import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export const IDLE_UNITS = ["day", "month", "year"] as const;
export type IdleUnit = (typeof IDLE_UNITS)[number];

export const LIMIT_DEFAULTS = {
  provider_bio_max: 1000,
  customer_bio_max: 300,
  rating_note_max: 300,
} as const;

export function normalizeIdleUnit(value?: string | null): IdleUnit {
  const unit = (value ?? "day").trim().toLowerCase();
  if (unit === "month" || unit === "شهر") {
    return "month";
  }
  if (unit === "year" || unit === "سنة" || unit === "عام") {
    return "year";
  }
  return "day";
}

export function parseIdleSetting(value: string | null | undefined, fallbackAmount = 90) {
  const raw = (value ?? "").trim();
  if (!raw) {
    return { amount: fallbackAmount, unit: "day" as IdleUnit };
  }
  const [amountPart, unitPart] = raw.split(/\s+/);
  const amount = Number(amountPart);
  return {
    amount: Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : fallbackAmount,
    unit: normalizeIdleUnit(unitPart),
  };
}

export function formatIdleSetting(amount: number, unit: IdleUnit) {
  return `${amount} ${unit}`;
}

export function subtractPeriod(from: Date, amount: number, unit: IdleUnit) {
  const next = new Date(from);
  if (unit === "year") {
    next.setFullYear(next.getFullYear() - amount);
  } else if (unit === "month") {
    next.setMonth(next.getMonth() - amount);
  } else {
    next.setDate(next.getDate() - amount);
  }
  return next;
}

export async function idlePeriodFor(prisma: PrismaService, who: "customer" | "provider") {
  const key = who === "customer" ? "idle_customer" : "idle_provider";
  const stored = await prisma.getSetting(key, "");
  if (stored) {
    return parseIdleSetting(stored);
  }
  if (who === "provider") {
    const days = await prisma.getSettingInt("idle_after_days", 90);
    return { amount: days, unit: "day" as IdleUnit };
  }
  return { amount: 90, unit: "day" as IdleUnit };
}

export async function idleCutoffFor(prisma: PrismaService, who: "customer" | "provider") {
  const { amount, unit } = await idlePeriodFor(prisma, who);
  return subtractPeriod(new Date(), amount, unit);
}

export async function settingMaxChars(
  prisma: PrismaService,
  key: keyof typeof LIMIT_DEFAULTS | string,
  fallback: number,
) {
  const parsed = await prisma.getSettingInt(key, fallback);
  return parsed > 0 ? parsed : fallback;
}

export async function assertMaxChars(
  prisma: PrismaService,
  key: keyof typeof LIMIT_DEFAULTS,
  value: string | undefined,
  label: string,
) {
  if (value == null) {
    return;
  }
  const max = await settingMaxChars(prisma, key, LIMIT_DEFAULTS[key]);
  if (value.length > max) {
    throw new BadRequestException(`${label} بحد أقصى ${max} حرف`);
  }
}
