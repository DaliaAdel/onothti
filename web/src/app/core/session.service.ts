import { Injectable, signal } from '@angular/core';
import type { AccountType, SessionUser, SignupDraft } from './models';

const TOKEN_KEY = 'onothiti_token';
const USER_KEY = 'onothiti_user';
const DRAFT_KEY = 'onothiti_signup';
const LOGIN_MOBILE_KEY = 'onothiti_login_mobile';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly user = signal<SessionUser | null>(this.readUser());

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return Boolean(this.token && this.user());
  }

  setSession(token: string, user: SessionUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.user.set(user);
  }

  patchUser(partial: Partial<SessionUser>): void {
    const current = this.user();
    if (!current) {
      return;
    }
    this.setSession(this.token ?? '', { ...current, ...partial });
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  saveDraft(draft: SignupDraft): void {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  getDraft(): SignupDraft | null {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as SignupDraft;
    } catch {
      return null;
    }
  }

  clearDraft(): void {
    sessionStorage.removeItem(DRAFT_KEY);
  }

  setLoginMobile(mobile: string): void {
    sessionStorage.setItem(LOGIN_MOBILE_KEY, mobile);
  }

  getLoginMobile(): string {
    return sessionStorage.getItem(LOGIN_MOBILE_KEY) ?? '';
  }

  homeFor(type?: AccountType): string {
    return type === 'PROVIDER' ? '/p' : '/c';
  }

  private readUser(): SessionUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }
}
