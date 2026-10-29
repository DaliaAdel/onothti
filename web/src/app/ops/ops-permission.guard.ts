import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { canManageRolePermissionSettings } from '../core/staff-permissions';
import { OPS_PAGE_PERMISSIONS, type OpsPage } from './ops-access';

function deny(router: Router, toast: ToastService) {
  toast.show('ليست لديكِ صلاحية فتح هذه الصفحة');
  return router.parseUrl('/ops');
}

export const opsPermissionGuard: CanActivateFn = (route) => {
  const page = route.data['opsPage'] as OpsPage | undefined;
  const rolesOnly = route.data['opsRolesOnly'] === true;
  const needed = page ? OPS_PAGE_PERMISSIONS[page] : undefined;
  if (!rolesOnly && !needed?.length) {
    return true;
  }
  const session = inject(SessionService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const api = inject(ApiService);

  const allowed = () => {
    if (rolesOnly && !canManageRolePermissionSettings(session.user()?.roleCode)) {
      return false;
    }
    if (needed?.length && !session.hasAnyPermission(...needed)) {
      return false;
    }
    return true;
  };

  if (allowed()) {
    return true;
  }
  const canRefresh = !session.user()?.roleCode || !(session.user()?.permissions ?? []).length;
  if (!canRefresh) {
    return deny(router, toast);
  }
  return api.opsMe().pipe(
    map((me) => {
      session.patchUser({
        permissions: me.permissions,
        roleCode: me.role?.code,
        roleNameAr: me.role?.nameAr,
        teamId: me.teamId,
        orgTeam: me.orgTeam,
      });
      return allowed() ? true : deny(router, toast);
    }),
    catchError(() => of(deny(router, toast))),
  );
};
