export const ACC_ROLE_CODES: Record<string, string> = {
  AM: "ACC-01",
  ADMIN: "ACC-01",
  OM: "ACC-02",
  FM: "ACC-03",
  AL: "ACC-04",
  OL: "ACC-05",
  OPS_LEAD: "ACC-05",
  FL: "ACC-06",
  AE: "ACC-07",
  OE: "ACC-08",
  OPERATOR: "ACC-08",
  FE: "ACC-09",
  FINANCE: "ACC-09",
};

export const ACC_CREATE = ["ACC-01", "ACC-02", "ACC-03", "ACC-04", "ACC-05", "ACC-06", "ACC-07", "ACC-08", "ACC-09"];
export const ACC_VIEW = ["ACC-18", "ACC-19", "ACC-20"];
export const ACC_ORG = ["ACC-10", "ACC-11", "ACC-12", "ACC-13"];
export const ACC_PERMS = ["ACC-14", "ACC-15"];
export const ACC_STAFF = [...ACC_CREATE, ...ACC_VIEW, ...ACC_ORG, ...ACC_PERMS, "ACC-16"];
export const OPS_ROLE_CODES = ["OM", "OL", "OE", "OPERATOR", "OPS_LEAD"];
export const ADMIN_FINANCE_ROLE_CODES = ["AM", "AL", "AE", "ADMIN", "FM", "FL", "FE", "FINANCE"];

export const PRO_CONTENT = ["PRO-01", "PRO-02", "PRO-03", "PRO-05", "PRO-06", "PRO-07", "PRO-08", "PRO-09", "PRO-10"];
export const FIN_CODES = ["FIN-01", "FIN-02", "FIN-03", "FIN-04", "FIN-05", "FIN-06", "PKG-02"];
export const PKG_CODES = ["PKG-01", "PKG-02", "PKG-03", "PKG-04", "PKG-05"];
export const RAT_CODES = ["RAT-01", "RAT-02", "RAT-03", "RAT-05"];
export const TKT_CODES = ["TKT-01", "TKT-02", "TKT-03"];
export const NOT_CODES = ["NOT-01", "NOT-02", "NOT-03", "NOT-04"];
export const REP_CODES = ["REP-01", "REP-02", "REP-03", "REP-04", "REP-05", "REP-06"];

export const MATRIX_TO_LEGACY: Record<string, string[]> = {
  "CAT-01": ["CATALOG_MANAGE"],
  "CAT-02": ["GEO_MANAGE"],
  "USR-01": ["ACCOUNTS_ACTION"],
  "PRO-01": ["CUSTOMERS_REVIEW"],
  "NOT-01": ["NOTIFY_PROVIDER", "NOTIFY_CUSTOMER"],
  "NOT-02": ["BROADCAST_ALL"],
  "NOT-03": ["BROADCAST_CUSTOMER"],
  "NOT-04": ["BROADCAST_PROVIDER"],
  "PKG-02": ["ESCALATE_FINANCE"],
};

const CHECK_ALIASES: Record<string, string[]> = {
  ...MATRIX_TO_LEGACY,
  "CATALOG_MANAGE": ["CAT-01"],
  "GEO_MANAGE": ["CAT-02"],
  "ACCOUNTS_ACTION": ["USR-01"],
  "CUSTOMERS_REVIEW": ["PRO-01"],
  "NOTIFY_PROVIDER": ["NOT-01"],
  "NOTIFY_CUSTOMER": ["NOT-01"],
  "BROADCAST_ALL": ["NOT-02"],
  "BROADCAST_CUSTOMER": ["NOT-03"],
  "BROADCAST_PROVIDER": ["NOT-04"],
  "ESCALATE_FINANCE": ["PKG-02"],
  "ACC-01": ["USERS_MANAGE"],
  "ACC-02": ["USERS_MANAGE"],
  "ACC-03": ["USERS_MANAGE"],
  "ACC-04": ["USERS_MANAGE"],
  "ACC-05": ["USERS_MANAGE"],
  "ACC-06": ["USERS_MANAGE"],
  "ACC-07": ["USERS_MANAGE"],
  "ACC-08": ["USERS_MANAGE"],
  "ACC-09": ["USERS_MANAGE"],
  "ACC-10": ["USERS_MANAGE"],
  "ACC-11": ["USERS_MANAGE"],
  "ACC-12": ["USERS_MANAGE"],
  "ACC-13": ["USERS_MANAGE"],
  "ACC-14": ["USERS_MANAGE"],
  "ACC-15": ["USERS_MANAGE"],
  "ACC-16": ["USERS_MANAGE"],
  "ACC-18": ["USERS_MANAGE"],
  "ACC-19": ["USERS_MANAGE"],
  "ACC-20": ["USERS_MANAGE"],
  "PRO-02": ["RATINGS_REVIEW"],
  "PRO-03": ["MEDIA_REVIEW"],
  "PRO-05": ["RATINGS_REVIEW", "PROVIDERS_APPROVE"],
  "PRO-06": ["MEDIA_REVIEW", "PROVIDERS_APPROVE"],
  "PRO-07": ["RATINGS_REVIEW", "PROVIDERS_APPROVE"],
  "PRO-08": ["MEDIA_REVIEW"],
  "PRO-09": ["MEDIA_REVIEW"],
  "PRO-10": ["RATINGS_REVIEW"],
  "USR-04": ["USERS_MANAGE"],
  "USR-05": ["ACCOUNTS_ACTION"],
  "USR-06": ["ACCOUNTS_ACTION"],
  "PKG-01": ["PACKAGES_MANAGE"],
  "PKG-03": ["PACKAGES_MANAGE"],
  "PKG-04": ["PACKAGES_MANAGE"],
  "PKG-05": ["PACKAGES_MANAGE"],
  "FIN-01": ["PAYMENTS_REVIEW"],
  "FIN-02": ["PAYMENTS_REVIEW"],
  "FIN-03": ["PAYMENTS_CONFIRM"],
  "FIN-04": ["PAYMENTS_CONFIRM"],
  "FIN-05": ["PAYMENTS_CONFIRM"],
  "FIN-06": ["PAYMENTS_REVIEW"],
  "RAT-01": ["RATINGS_REVIEW"],
  "RAT-02": ["RATINGS_REVIEW"],
  "RAT-03": ["RATINGS_REVIEW"],
  "RAT-05": ["SETTINGS_MANAGE"],
  SETTINGS_MANAGE: ["RAT-05"],
  "TKT-01": ["TICKETS_MANAGE"],
  "TKT-02": ["TICKETS_MANAGE"],
  "TKT-03": ["TICKETS_MANAGE"],
  "REP-01": ["REPORTS_VIEW"],
  "REP-02": ["REPORTS_VIEW"],
  "REP-03": ["REPORTS_VIEW"],
  "REP-04": ["REPORTS_VIEW"],
  "REP-05": ["REPORTS_VIEW"],
  "REP-06": ["REPORTS_VIEW"],
};

export function expandPermissionCodes(codes: string[]): string[] {
  const next = new Set<string>();
  for (const code of codes) {
    next.add(code);
    for (const extra of CHECK_ALIASES[code] ?? []) {
      next.add(extra);
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
  return staffHas(held, code);
}

export function mergeMatrixCodes(
  selected: Record<string, boolean>,
  matrixCodes: string[],
  current: string[],
): string[] {
  const matrixSet = new Set(matrixCodes);
  const legacyAlias = new Set(Object.values(MATRIX_TO_LEGACY).flat());
  const kept = current.filter((code) => !matrixSet.has(code) && !legacyAlias.has(code));
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
    return "ACC-15";
  }
  return "ACC-14";
}

export function effectivePermissionCodes(staff: {
  customPermissions?: boolean;
  grants?: { permission: { code: string } }[] | null;
  role?: { permissions: { permission: { code: string } }[] } | null;
}): { codes: string[]; custom: boolean } {
  if (staff.customPermissions) {
    return {
      codes: (staff.grants ?? []).map((row) => row.permission.code),
      custom: true,
    };
  }
  return {
    codes: staff.role?.permissions.map((row) => row.permission.code) ?? [],
    custom: false,
  };
}
