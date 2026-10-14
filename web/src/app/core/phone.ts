function latinDigits(raw: string): string {
  return Array.from(raw ?? '')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0x0660 && code <= 0x0669) {
        return String(code - 0x0660);
      }
      if (code >= 0x06f0 && code <= 0x06f9) {
        return String(code - 0x06f0);
      }
      return ch;
    })
    .join('');
}

export function toLocalPhone(raw: string): string {
  let digits = latinDigits(raw).replace(/\D/g, '');
  if (digits.startsWith('00966')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('966')) {
    digits = digits.slice(3);
  }
  if (digits.length === 9 && digits.startsWith('5')) {
    digits = `0${digits}`;
  }
  return digits.slice(0, 10);
}

export function toMobile(raw: string): string {
  return toLocalPhone(raw);
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
  const error = err as { error?: { message?: string | string[] }; message?: string | string[] };
  const message = error?.error?.message ?? error?.message;
  if (Array.isArray(message) && message.length) {
    return String(message[0]);
  }
  if (typeof message === 'string' && message.trim() && !message.startsWith('Http failure')) {
    return message;
  }
  return fallback;
}
