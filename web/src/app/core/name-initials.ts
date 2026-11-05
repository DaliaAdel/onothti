import { Pipe, PipeTransform } from '@angular/core';

const LETTER = /\p{L}/u;

function firstLetter(word: string): string {
  for (const ch of word) {
    if (LETTER.test(ch)) {
      return ch.toLocaleUpperCase('ar');
    }
  }
  return '';
}

export function nameInitials(name?: string | null, fallback = ''): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .map((part) => firstLetter(part))
    .filter(Boolean);
  if (!parts.length) {
    return fallback;
  }
  return parts.length === 1 ? parts[0] : `${parts[0]}${parts[1]}`;
}

@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(value: string | null | undefined, fallback = ''): string {
    return nameInitials(value, fallback);
  }
}
