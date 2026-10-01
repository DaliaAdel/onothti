import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';
import type { AccountType } from './models';

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!session.isLoggedIn) {
    return true;
  }
  return router.parseUrl(session.homeFor(session.user()?.accountType));
};

export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (session.isLoggedIn) {
    return true;
  }
  return router.parseUrl('/login');
};

export const roleGuard = (role: AccountType): CanActivateFn => {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);
    if (!session.isLoggedIn) {
      return router.parseUrl('/login');
    }
    const type = session.user()?.accountType;
    if (type === role) {
      return true;
    }
    return router.parseUrl(session.homeFor(type));
  };
};
