export function newestFirst<T extends { createdAt?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0));
}

export function keepSelected<T extends { id: string }>(rows: T[], current: T | null): T | null {
  if (!current) {
    return null;
  }
  return rows.find((row) => row.id === current.id) ?? null;
}

export function opsDate(value?: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16).replace('T', ' ');
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function clip(text?: string | null, max = 42): string {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!value) {
    return '—';
  }
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function statusTone(status: string): 'success' | 'warning' | 'error' | '' {
  if (['ACTIVE', 'APPROVED', 'RESOLVED', 'CLOSED', 'VISIBLE'].includes(status)) {
    return 'success';
  }
  if (['PENDING', 'PENDING_APPROVAL', 'SENT', 'IN_PROGRESS', 'OPEN', 'ESCALATED', 'INACTIVE'].includes(status)) {
    return 'warning';
  }
  if (['REJECTED', 'SUSPENDED', 'CANCELLED', 'DELETED', 'RESTRICTED'].includes(status)) {
    return 'error';
  }
  return '';
}
