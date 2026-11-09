import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-login',
  imports: [RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <div class="auth-box">
        <a class="auth-back" routerLink="/">{{ locale.t('auth.home') }}</a>
        <span class="auth-kicker">{{ locale.t('auth.choice.kicker') }}</span>
        <h2>{{ locale.t('auth.choice.title') }}</h2>
        <p class="muted">{{ locale.t('auth.choice.sub') }}</p>
        <div class="entry-options">
          <a class="entry-card" routerLink="/login/phone">
            <span class="entry-icon">✓</span>
            <b>{{ locale.t('auth.choice.hasAccount') }}</b>
            <small>{{ locale.t('auth.choice.hasAccountText') }}</small>
          </a>
          <a class="entry-card" routerLink="/signup">
            <span class="entry-icon">＋</span>
            <b>{{ locale.t('auth.choice.new') }}</b>
            <small>{{ locale.t('auth.choice.newText') }}</small>
          </a>
        </div>
      </div>
    </app-auth-layout>
  `,
})
export class LoginComponent {
  readonly locale = inject(LocaleService);
}
