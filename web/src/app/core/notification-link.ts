import type { AccountType, AppNotification } from './models';

function splitRef(ref?: string | null): { kind: string; id: string } | null {
  const value = ref?.trim();
  if (!value) {
    return null;
  }
  const index = value.indexOf(':');
  if (index <= 0) {
    return { kind: value, id: '' };
  }
  return { kind: value.slice(0, index), id: value.slice(index + 1) };
}

function staffLink(kind?: string, id?: string): string {
  if (kind === 'receipt') {
    return '/ops/approvals?kind=receipt';
  }
  if (kind === 'portfolio') {
    return '/ops/approvals?kind=portfolio';
  }
  if (kind === 'rating') {
    return '/ops/approvals?kind=rating';
  }
  if (kind === 'change' || kind === 'media') {
    return '/ops/approvals';
  }
  if (kind === 'provider') {
    return id ? `/ops/approvals?kind=accounts&account=${id}` : '/ops/approvals?kind=accounts';
  }
  if (kind === 'ticket') {
    return '/ops/tickets';
  }
  if (kind === 'complaint') {
    return '/ops/reviews';
  }
  if (kind === 'account') {
    return '/ops/clients';
  }
  return '/ops/approvals';
}

function providerLink(kind?: string, type?: string): string {
  if (type === 'PROFILE_VIEW') {
    return '/p/views';
  }
  if (type === 'CONTACT') {
    return '/p';
  }
  if (kind === 'rating') {
    return '/p/reviews';
  }
  if (kind === 'ticket' || kind === 'complaint') {
    return '/p/support';
  }
  if (kind === 'receipt') {
    return '/p/payment-status';
  }
  if (kind === 'portfolio' || kind === 'media') {
    return '/p/portfolio';
  }
  return '/p/account';
}

function customerLink(kind?: string): string {
  if (kind === 'ticket' || kind === 'complaint') {
    return '/c/requests';
  }
  if (kind === 'rating') {
    return '/c/account';
  }
  return '/c/account';
}

export function notificationLink(
  accountType: AccountType | string | null | undefined,
  item: Pick<AppNotification, 'type' | 'ref'>,
): string {
  const parsed = splitRef(item.ref);
  const kind = parsed?.kind;
  const id = parsed?.id;
  if (accountType === 'STAFF') {
    return staffLink(kind, id);
  }
  if (accountType === 'PROVIDER') {
    return providerLink(kind, item.type);
  }
  return customerLink(kind);
}
