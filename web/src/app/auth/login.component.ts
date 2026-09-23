import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage, isSaudiMobile, toLocalPhone, toMobile } from '../core/phone';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box" (ngSubmit)="submit()">
        <span class="eyebrow">{{ locale.t('auth.login.eyebrow') }}</span>
        <h1>{{ locale.t('auth.login.title') }}</h1>
        <p class="sub">{{ locale.t('auth.login.sub') }}</p>
        <div class="field">
          <label>{{ locale.t('auth.phone') }}</label>
          <input
            class="input"
            dir="ltr"
            name="phone"
            [ngModel]="phone"
            (ngModelChange)="phone = toLocalPhone($event)"
            (paste)="onPhonePaste($event)"
            inputmode="numeric"
            maxlength="10"
            placeholder="05xxxxxxxx"
            autocomplete="tel"
            [attr.aria-label]="locale.t('auth.phone')"
          />
        </div>
        <div class="field" style="margin-top:12px">
          <label>{{ locale.t('auth.password') }}</label>
          <input class="input" name="password" type="password" [(ngModel)]="password" [placeholder]="locale.t('auth.passwordHint')" />
        </div>
        @if (errorText) {
          <p class="auth-error">{{ errorText }}</p>
        }
        <button class="btn primary full" style="margin-top:16px" type="submit" [disabled]="loading">
          {{ locale.t('auth.continue') }}
          <app-icon name="arrow" />
        </button>
        <div class="divider">{{ locale.t('auth.login.divider') }}</div>
        <a class="btn ghost full" routerLink="/signup">{{ locale.t('auth.login.create') }}</a>
        <div class="auth-note">
          <b>✓</b>
          <span>{{ locale.t('auth.login.note') }}</span>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class LoginComponent {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  phone = '';
  password = '';
  loading = false;
  errorKey = '';
  errorRaw = '';
  readonly toLocalPhone = toLocalPhone;

  get errorText(): string {
    return this.errorKey ? this.locale.t(this.errorKey) : this.errorRaw;
  }

  private setError(key: string | null, raw = ''): void {
    this.errorKey = key ?? '';
    this.errorRaw = key ? '' : raw;
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.phone = toLocalPhone(event.clipboardData?.getData('text') ?? '');
  }

  submit(): void {
    const mobile = toMobile(this.phone);
    if (!isSaudiMobile(mobile)) {
      this.setError('auth.login.phoneInvalid');
      return;
    }
    if (this.password.length < 8) {
      this.setError('auth.login.passwordShort');
      return;
    }
    this.loading = true;
    this.setError('');
    this.session.setLoginMobile(mobile);
    this.api.login(mobile, this.password).subscribe({
      next: (res) => {
        this.session.setSession(res.accessToken, res.user);
        this.toast.show(this.locale.t('auth.login.welcome'));
        void this.router.navigateByUrl(this.session.homeFor(res.user.accountType));
      },
      error: (err) => {
        this.loading = false;
        const message = apiMessage(err, '');
        if (message.includes('رمز التحقق')) {
          this.session.saveDraft({
            displayName: '',
            mobile,
            password: this.password,
          });
          this.toast.show(this.locale.t('auth.verifyFirst'));
          void this.router.navigate(['/otp'], { queryParams: { purpose: 'REGISTER' } });
          return;
        }
        this.setError(this.locale.messageKey(message), message || this.locale.t('auth.login.failed'));
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
