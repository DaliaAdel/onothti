import { canManageRolePermissionSettings } from '../core/staff-permissions';

export const OPS_PAGE_PERMISSIONS = {
  approvals: [
    'PRO-02',
    'PRO-03',
    'PRO-05',
    'PRO-06',
    'PRO-07',
    'PRO-08',
    'PRO-09',
    'RAT-01',
    'FIN-01',
    'FIN-02',
    'FIN-03',
    'FIN-05',
    'FIN-06',
    'PKG-02',
  ],
  reviews: ['RAT-01', 'TKT-01', 'TKT-02', 'TKT-03'],
  tickets: ['TKT-01', 'TKT-02', 'TKT-03'],
  clients: ['PRO-01', 'NOT-01', 'USR-01', 'USR-04', 'USR-05', 'USR-06'],
  notices: ['NOT-01', 'NOT-02', 'NOT-03', 'NOT-04'],
  settings: ['SETTINGS_MANAGE', 'RAT-05'],
  legal: ['LEGAL_MANAGE', 'RAT-05'],
  geo: ['CAT-02'],
  catalog: ['CAT-01'],
  packages: ['PKG-01', 'PKG-03', 'PKG-04', 'PKG-05'],
  org: ['ACC-10', 'ACC-11', 'ACC-12', 'ACC-13', 'ACC-18', 'ACC-19', 'ACC-20'],
  staff: [
    'ACC-01',
    'ACC-02',
    'ACC-03',
    'ACC-04',
    'ACC-05',
    'ACC-06',
    'ACC-07',
    'ACC-08',
    'ACC-09',
    'ACC-16',
    'ACC-18',
    'ACC-19',
    'ACC-20',
  ],
  permissions: ['ACC-14', 'ACC-15'],
  events: ['REP-01'],
  activity: ['REP-06'],
} as const;

export type OpsPage = keyof typeof OPS_PAGE_PERMISSIONS;

export function canOpenOpsPage(
  session: { hasAnyPermission: (...codes: string[]) => boolean },
  page: OpsPage,
): boolean {
  return session.hasAnyPermission(...OPS_PAGE_PERMISSIONS[page]);
}

export function canOpenPermissionSettings(session: {
  user: () => { roleCode?: string | null } | null;
}): boolean {
  return canManageRolePermissionSettings(session.user()?.roleCode);
}
