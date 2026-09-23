import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-account-type',
  imports: [RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout>
      <div class="auth-box">
        <a routerLink="/signup" class="back-link">{{ locale.t('auth.type.back') }}</a>
        <span class="eyebrow">{{ locale.t('auth.type.eyebrow') }}</span>
        <h1>{{ locale.t('auth.type.title') }}</h1>
        <p class="sub">{{ locale.t('auth.type.sub') }}</p>
        <div class="account-type-grid">
          <button class="account-type-card" type="button" (click)="choose('CUSTOMER')">
            <span class="type-icon"><app-icon name="search" /></span>
            <div>
              <h3>{{ locale.t('role.customer') }}</h3>
              <p>{{ locale.t('auth.type.customerText') }}</p>
            </div>
            <span class="type-arrow"><app-icon name="chev" /></span>
          </button>
          <button class="account-type-card" type="button" (click)="choose('PROVIDER')">
            <span class="type-icon"><app-icon name="spark" /></span>
            <div>
              <h3>{{ locale.t('role.provider') }}</h3>
              <p>{{ locale.t('auth.type.providerText') }}</p>
            </div>
            <span class="type-arrow"><app-icon name="chev" /></span>
          </button>
        </div>
        <div class="auth-note">
          <b>✓</b>
          <span>{{ locale.t('auth.type.note') }}</span>
        </div>
      </div>
    </app-auth-layout>
  `,
})
export class AccountTypeComponent {
  private readonly session = inject(SessionService);
  readonly locale = inject(LocaleService);
  private readonly router = inject(Router);

  choose(accountType: 'CUSTOMER' | 'PROVIDER'): void {
    const draft = this.session.getDraft();
    if (!draft) {
      void this.router.navigateByUrl('/signup');
      return;
    }
    this.session.saveDraft({ ...draft, accountType });
    void this.router.navigateByUrl(accountType === 'CUSTOMER' ? '/signup/customer' : '/signup/provider');
  }
}
