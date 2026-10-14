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
