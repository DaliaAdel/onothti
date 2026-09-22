export const SAUDI_MOBILE_MESSAGE =
  'رقم الجوال لازم يكون سعودي 10 أرقام ويبدأ بـ 05';

export function toMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('5')) {
    return `0${digits}`;
  }
  if (digits.length === 10 && digits.startsWith('05')) {
    return digits;
  }
  if (digits.startsWith('966')) {
    const local = digits.slice(3);
    if (local.length === 9 && local.startsWith('5')) {
      return `0${local}`;
    }
    if (local.length === 10 && local.startsWith('05')) {
      return local;
    }
  }
  return digits;
}

export function isSaudiMobile(raw: string): boolean {
  return /^05[0-9]{8}$/.test(toMobile(raw));
}

export function displayPhone(raw: string): string {
  const mobile = toMobile(raw);
  if (mobile.length === 10) {
    return `+966 ${mobile.slice(1, 3)} ${mobile.slice(3, 6)} ${mobile.slice(6)}`;
  }
  return raw;
}

export function apiMessage(err: unknown, fallback = 'حدث خطأ غير متوقع'): string {
  const error = err as { error?: { message?: string | string[] } };
  const message = error?.error?.message;
  if (Array.isArray(message) && message.length) {
    return message[0];
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  return fallback;
}
