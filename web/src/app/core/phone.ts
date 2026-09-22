export function toLocalPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('966')) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('05')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 9);
}

export function toMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('05')) {
    return digits;
  }
  const local = toLocalPhone(raw);
  if (local.length === 9 && local.startsWith('5')) {
    return `0${local}`;
  }
  if (digits.length === 9 && digits.startsWith('5')) {
    return `0${digits}`;
  }
  if (digits.startsWith('966') && digits.length >= 12) {
    return toMobile(digits.slice(3));
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
