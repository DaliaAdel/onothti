import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import type { AccountType } from '../core/models';
import { apiMessage, isSaudiMobile, toLocalPhone, toMobile } from '../core/phone';
import { SessionService } from '../core/session.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-login-phone',
  imports: [FormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box" (ngSubmit)="submit()">
        <a class="auth-back" [routerLink]="backLink">← رجوع</a>
        <span class="auth-kicker">{{ isNew ? 'إنشاء حساب جديد' : 'لدي حساب' }}</span>
        <h2>رقم الهاتف</h2>
        <p class="muted">أدخلي رقم الهاتف وسنرسل لكِ رمز تحقق OTP.</p>
        <div class="field">
          <label>رقم الجوال</label>
          <input
            id="loginPhone"
            dir="ltr"
            name="phone"
            [ngModel]="phone"
            (ngModelChange)="phone = toLocalPhone($event)"
            (paste)="onPhonePaste($event)"
            inputmode="numeric"
            maxlength="10"
            placeholder="05X XXX XXXX"
            autocomplete="tel"
          />
        </div>
        @if (errorText) {
          <p class="auth-error">{{ errorText }}</p>
        }
        <button class="btn primary auth-submit" type="submit" [disabled]="loading">إرسال رمز التحقق</button>
      </form>
    </app-auth-layout>
  `,
})
export class LoginPhoneComponent {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly locale = inject(LocaleService);

  phone = '';
  loading = false;
  errorKey = '';
  errorRaw = '';
  readonly toLocalPhone = toLocalPhone;

  get isNew(): boolean {
    return this.router.url.startsWith('/signup');
  }

  get backLink(): string {
    return this.isNew ? '/signup' : '/login';
  }

  get errorText(): string {
    return this.errorKey ? this.locale.t(this.errorKey) : this.errorRaw;
  }

  private setError(key: string | null, raw = ''): void {
    this.errorKey = key ?? '';
    this.errorRaw = key ? '' : raw;
  }

  private signupAccountType(): AccountType {
    const role = this.route.snapshot.queryParamMap.get('role');
    if (role === 'customer') {
      return 'CUSTOMER';
    }
    if (role === 'provider') {
      return 'PROVIDER';
    }
    return this.session.getDraft()?.accountType === 'CUSTOMER' ? 'CUSTOMER' : 'PROVIDER';
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
    this.session.saveDraft({
      displayName: '',
      mobile,
      needsProfile: true,
      accountType: this.isNew ? this.signupAccountType() : undefined,
    });
    this.api.startPhone(mobile).subscribe({
      next: () => {
        void this.router.navigate(['/otp'], {
          queryParams: { purpose: this.isNew ? 'REGISTER' : 'LOGIN' },
        });
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
