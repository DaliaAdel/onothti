import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage, isSaudiMobile, toLocalPhone, toMobile } from '../core/phone';
import { SessionService } from '../core/session.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, AuthLayoutComponent, IconComponent],
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
        @if (errorText) {
          <p class="auth-error">{{ errorText }}</p>
        }
        <button class="btn primary full" style="margin-top:16px" type="submit" [disabled]="loading">
          {{ locale.t('auth.login.sendOtp') }}
          <app-icon name="arrow" />
        </button>
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
  readonly locale = inject(LocaleService);

  phone = '';
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
    this.loading = true;
    this.setError('');
    this.session.setLoginMobile(mobile);
    this.session.saveDraft({ displayName: '', mobile, needsProfile: true });
    this.api.startPhone(mobile).subscribe({
      next: () => {
        void this.router.navigate(['/otp'], { queryParams: { purpose: 'LOGIN' } });
      },
      error: (err) => {
        this.loading = false;
        const message = apiMessage(err, '');
        this.setError(this.locale.messageKey(message), message || this.locale.t('auth.otp.sendFailed'));
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
