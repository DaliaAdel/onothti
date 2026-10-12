import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage, displayPhone } from '../core/phone';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-login-password',
  imports: [FormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box" (ngSubmit)="submit()">
        <a class="auth-back" routerLink="/login/phone">← رجوع</a>
        <span class="auth-kicker">حساب التشغيل</span>
        <h2>كلمة المرور</h2>
        <p class="muted">أدخلي كلمة مرور حساب التشغيل المرتبط بـ <b dir="ltr">{{ phoneLabel }}</b></p>
        <div class="field">
          <div class="field-label">
            <label>{{ locale.t('auth.password') }}</label>
            <a class="link" routerLink="/login/forgot">نسيت كلمة المرور؟</a>
          </div>
          <input
            class="input"
            name="password"
            type="password"
            [(ngModel)]="password"
            required
            minlength="8"
            autocomplete="current-password"
            [placeholder]="locale.t('auth.passwordHint')"
          />
        </div>
        @if (errorText) {
          <p class="auth-error">{{ errorText }}</p>
        }
        <button class="btn primary auth-submit" type="submit" [disabled]="loading">دخول لوحة  المعلومات</button>
      </form>
    </app-auth-layout>
  `,
})
export class LoginPasswordComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  password = '';
  loading = false;
  errorKey = '';
  errorRaw = '';

  get phoneLabel(): string {
    return displayPhone(this.mobile);
  }

  get mobile(): string {
    return this.session.getLoginMobile() || this.session.getDraft()?.mobile || '';
  }

  get errorText(): string {
    return this.errorKey ? this.locale.t(this.errorKey) : this.errorRaw;
  }

  ngOnInit(): void {
    if (!this.mobile) {
      void this.router.navigateByUrl('/login/phone');
    }
  }

  submit(): void {
    if (this.password.length < 8) {
      this.errorKey = 'auth.login.passwordShort';
      this.errorRaw = '';
      return;
    }
    this.loading = true;
    this.errorKey = '';
    this.errorRaw = '';
    this.api.login(this.mobile, this.password).subscribe({
      next: (res) => {
        this.session.clearDraft();
        this.session.setSession(res.accessToken, res.user);
        this.toast.show(this.locale.t('auth.login.welcome'));
        void this.router.navigateByUrl(this.session.homeFor(res.user.accountType));
      },
      error: (err) => {
        this.loading = false;
        const message = apiMessage(err, '');
        if (message.includes('تعيين كلمة مرور')) {
          void this.router.navigate(['/otp'], { queryParams: { purpose: 'LOGIN' } });
          this.toast.show(this.locale.t('auth.staff.setFirst'));
          return;
        }
        this.errorKey = this.locale.messageKey(message) ?? '';
        this.errorRaw = this.errorKey ? '' : message || this.locale.t('auth.login.failed');
      },
    });
  }
}
