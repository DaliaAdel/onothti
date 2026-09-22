import { applyDecorators } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { Matches } from "class-validator";

export const SAUDI_MOBILE_PATTERN = /^05[0-9]{8}$/;
export const SAUDI_MOBILE_MESSAGE =
  "رقم الجوال لازم يكون سعودي 10 أرقام ويبدأ بـ 05";

export function normalizeMobile(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("5")) {
    return `0${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("05")) {
    return digits;
  }
  if (digits.startsWith("966")) {
    const local = digits.slice(3);
    if (local.length === 9 && local.startsWith("5")) {
      return `0${local}`;
    }
    if (local.length === 10 && local.startsWith("05")) {
      return local;
    }
  }
  return digits;
}

export function IsSaudiMobile() {
  return applyDecorators(
    ApiProperty({
      example: "0501234567",
      description: SAUDI_MOBILE_MESSAGE,
    }),
    Transform(({ value }) => normalizeMobile(value)),
    Matches(SAUDI_MOBILE_PATTERN, { message: SAUDI_MOBILE_MESSAGE }),
  );
}
