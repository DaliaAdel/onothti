import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { OPS_PAGE_PERMISSIONS, type OpsPage } from './ops-access';

function deny(router: Router, toast: ToastService) {
  toast.show('ليست لديكِ صلاحية فتح هذه الصفحة');
  return router.parseUrl('/ops');
}

export const opsPermissionGuard: CanActivateFn = (route) => {
  const page = route.data['opsPage'] as OpsPage | undefined;
  if (!page) {
    return true;
  }
  const needed = OPS_PAGE_PERMISSIONS[page];
  if (!needed?.length) {
    return true;
  }
  const session = inject(SessionService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const api = inject(ApiService);

  if (session.hasAnyPermission(...needed)) {
    return true;
  }
  if ((session.user()?.permissions ?? []).length) {
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
      return session.hasAnyPermission(...needed) ? true : deny(router, toast);
    }),
    catchError(() => of(deny(router, toast))),
  );
};
