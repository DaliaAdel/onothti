export const ACC_ROLE_CODES: Record<string, string> = {
  AM: 'ACC-01',
  ADMIN: 'ACC-01',
  OM: 'ACC-02',
  FM: 'ACC-03',
  AL: 'ACC-04',
  OL: 'ACC-05',
  OPS_LEAD: 'ACC-05',
  FL: 'ACC-06',
  AE: 'ACC-07',
  OE: 'ACC-08',
  OPERATOR: 'ACC-08',
  FE: 'ACC-09',
  FINANCE: 'ACC-09',
};

export const SUPER_ROLE_CODE = 'SUPER';
export const HIDDEN_ROLE_CODES = [SUPER_ROLE_CODE];
export const ROLE_PERMISSION_SETTINGS_ROLES = [SUPER_ROLE_CODE, 'AM', 'ADMIN'];

export const ACC_CREATE = ['ACC-01', 'ACC-02', 'ACC-03', 'ACC-04', 'ACC-05', 'ACC-06', 'ACC-07', 'ACC-08', 'ACC-09'];
export const ACC_VIEW = ['ACC-18', 'ACC-19', 'ACC-20'];
export const ACC_ORG = ['ACC-10', 'ACC-11', 'ACC-12', 'ACC-13'];
export const ACC_PERMS = ['ACC-14', 'ACC-15'];
export const ACC_STAFF = [...ACC_CREATE, ...ACC_VIEW, ...ACC_ORG, ...ACC_PERMS, 'ACC-16'];
export const ADMIN_FINANCE_ROLE_CODES = ['AM', 'AL', 'AE', 'ADMIN', 'FM', 'FL', 'FE', 'FINANCE'];

export const MATRIX_TO_LEGACY: Record<string, string[]> = {
  'CAT-01': ['CATALOG_MANAGE'],
  'CAT-02': ['GEO_MANAGE'],
  'USR-01': ['ACCOUNTS_ACTION'],
  'USR-04': ['USERS_MANAGE'],
  'PRO-01': ['CUSTOMERS_REVIEW'],
  'NOT-01': ['NOTIFY_PROVIDER', 'NOTIFY_CUSTOMER'],
  'NOT-02': ['BROADCAST_ALL'],
  'NOT-03': ['BROADCAST_CUSTOMER'],
  'NOT-04': ['BROADCAST_PROVIDER'],
  'PKG-02': ['ESCALATE_FINANCE'],
  'RAT-05': ['SETTINGS_MANAGE'],
};

const LEGACY_TO_MATRIX: Record<string, string> = Object.fromEntries(
  Object.entries(MATRIX_TO_LEGACY).flatMap(([matrix, legacies]) =>
    legacies.map((legacy) => [legacy, matrix]),
  ),
);

export function expandPermissionCodes(codes: string[]): string[] {
  const next = new Set<string>();
  for (const code of codes) {
    next.add(code);
    for (const extra of MATRIX_TO_LEGACY[code] ?? []) {
      next.add(extra);
    }
    const matrix = LEGACY_TO_MATRIX[code];
    if (matrix) {
      next.add(matrix);
    }
  }
  return [...next];
}

export function staffHas(held: Iterable<string>, ...needed: string[]): boolean {
  const current = new Set(held);
  return expandPermissionCodes(needed).some((code) => current.has(code));
}

export function staffHasExact(held: Iterable<string>, ...needed: string[]): boolean {
  const current = new Set(held);
  return needed.some((code) => current.has(code));
}

export function matrixCodeIsOn(code: string, held: Iterable<string>): boolean {
  return staffHasExact(held, code);
}

export function mergeMatrixCodes(
  selected: Record<string, boolean>,
  matrixCodes: string[],
  current: string[],
): string[] {
  const matrixSet = new Set(matrixCodes);
  const aliasCodes = new Set(Object.values(MATRIX_TO_LEGACY).flat());
  const kept = current.filter((code) => !matrixSet.has(code) && !aliasCodes.has(code));
  const picked = matrixCodes.filter((code) => selected[code]);
  const mirrored = picked.flatMap((code) => MATRIX_TO_LEGACY[code] ?? []);
  return [...new Set([...kept, ...picked, ...mirrored])];
}

export function accCodeForRole(roleCode?: string | null): string | null {
  if (!roleCode) {
    return null;
  }
  return ACC_ROLE_CODES[roleCode] ?? null;
}

export function permForStaffPermissions(roleCode?: string | null): string {
  if (roleCode && ADMIN_FINANCE_ROLE_CODES.includes(roleCode)) {
    return 'ACC-15';
  }
  return 'ACC-14';
}

export function canManageRolePermissionSettings(roleCode?: string | null): boolean {
  return Boolean(roleCode && ROLE_PERMISSION_SETTINGS_ROLES.includes(roleCode));
}
