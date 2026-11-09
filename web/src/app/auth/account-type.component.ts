import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-account-type',
  imports: [RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <div class="auth-box">
        <a class="auth-back" routerLink="/login">{{ locale.t('auth.back') }}</a>
        <span class="auth-kicker">{{ locale.t('auth.choice.new') }}</span>
        <h2>{{ locale.t('auth.type.choose') }}</h2>
        <p class="muted">{{ locale.t('auth.type.chooseSub') }}</p>
        <div class="entry-options role-options">
          <a class="entry-card" routerLink="/signup/phone" [queryParams]="{ role: 'provider' }">
            <span class="entry-icon">✦</span>
            <b>{{ locale.t('role.provider') }}</b>
            <small>{{ locale.t('auth.type.providerHint') }}</small>
          </a>
          <a class="entry-card" routerLink="/signup/phone" [queryParams]="{ role: 'customer' }">
            <span class="entry-icon">♡</span>
            <b>{{ locale.t('role.customer') }}</b>
            <small>{{ locale.t('auth.type.customerHint') }}</small>
          </a>
        </div>
      </div>
    </app-auth-layout>
  `,
})
export class AccountTypeComponent {
  readonly locale = inject(LocaleService);
}
