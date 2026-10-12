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
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box" (ngSubmit)="submit()">
        <a class="auth-back" routerLink="/otp" [queryParams]="{ purpose: 'RESET_PASSWORD' }">← رجوع</a>
        <span class="auth-kicker">استعادة الحساب</span>
        <h2>إنشاء كلمة مرور جديدة</h2>
        <p class="muted">بعد تأكيد رقم <b dir="ltr">{{ phoneLabel }}</b> أدخلي كلمة المرور الجديدة مرتين.</p>
        <div class="field">
          <label>{{ locale.t('auth.password') }}</label>
          <input class="input" name="password" type="password" [(ngModel)]="password" required minlength="8" autocomplete="new-password" />
        </div>
        <div class="field">
          <label>{{ locale.t('auth.confirm') }}</label>
          <input class="input" name="confirm" type="password" [(ngModel)]="confirm" required minlength="8" autocomplete="new-password" />
        </div>
        @if (errorText) {
          <p class="auth-error">{{ errorText }}</p>
        }
        <button class="btn primary auth-submit" type="submit" [disabled]="loading">حفظ ثم تسجيل الدخول</button>
      </form>
    </app-auth-layout>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  password = '';
  confirm = '';
  loading = false;
  errorKey = '';
  errorRaw = '';

  get phoneLabel(): string {
    return displayPhone(this.mobile);
  }

  get mobile(): string {
    return this.session.getDraft()?.mobile || this.session.getLoginMobile();
  }

  get code(): string {
    return this.session.getDraft()?.otpCode ?? '';
  }

  get errorText(): string {
    return this.errorKey ? this.locale.t(this.errorKey) : this.errorRaw;
  }

  ngOnInit(): void {
    if (!this.mobile || !this.code) {
      void this.router.navigateByUrl('/login/forgot');
    }
  }

  submit(): void {
    if (this.password.length < 8) {
      this.errorKey = 'auth.login.passwordShort';
      this.errorRaw = '';
      return;
    }
    if (this.password !== this.confirm) {
      this.errorKey = 'auth.signup.mismatch';
      this.errorRaw = '';
      return;
    }
    this.loading = true;
    this.errorKey = '';
    this.errorRaw = '';
    this.api.resetPassword(this.mobile, this.code, this.password).subscribe({
      next: () => {
        this.session.saveDraft({ displayName: '', mobile: this.mobile, needsProfile: false });
        this.toast.show(this.locale.t('auth.staff.passwordSaved'));
        void this.router.navigateByUrl('/login/password');
      },
      error: (err) => {
        this.loading = false;
        const message = apiMessage(err, '');
        this.errorKey = this.locale.messageKey(message) ?? '';
        this.errorRaw = this.errorKey ? '' : message || this.locale.t('auth.login.failed');
      },
    });
  }
}
