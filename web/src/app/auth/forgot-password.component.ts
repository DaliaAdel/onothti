import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage, isSaudiMobile, toLocalPhone, toMobile } from '../core/phone';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box" (ngSubmit)="submit()">
        <a class="auth-back" routerLink="/login/password">← رجوع</a>
        <span class="auth-kicker">استعادة الحساب</span>
        <h2>نسيت كلمة المرور</h2>
        <p class="muted">أدخلي رقم الجوال لاستلام رمز التحقق ثم تعيين كلمة مرور جديدة.</p>
        <div class="field">
          <label>رقم الجوال</label>
          <input class="input" dir="ltr" name="phone" [(ngModel)]="phone" placeholder="05xxxxxxxx" />
        </div>
        @if (errorText) {
          <p class="auth-error">{{ errorText }}</p>
        }
        <button class="btn primary auth-submit" type="submit" [disabled]="loading">إرسال رمز التحقق</button>
      </form>
    </app-auth-layout>
  `,
})
export class ForgotPasswordComponent {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  phone = toLocalPhone(this.session.getLoginMobile() || this.session.getDraft()?.mobile || '');
  loading = false;
  errorKey = '';
  errorRaw = '';

  get errorText(): string {
    return this.errorKey ? this.locale.t(this.errorKey) : this.errorRaw;
  }

  submit(): void {
    const mobile = toMobile(this.phone);
    if (!isSaudiMobile(mobile)) {
      this.errorKey = 'auth.login.phoneInvalid';
      this.errorRaw = '';
      return;
    }
    this.loading = true;
    this.errorKey = '';
    this.errorRaw = '';
    this.session.setLoginMobile(mobile);
    this.session.saveDraft({ displayName: '', mobile, needsProfile: false });
    this.api.forgotPassword(mobile).subscribe({
      next: () => {
        this.toast.show(this.locale.t('auth.otp.resent'));
        void this.router.navigate(['/otp'], { queryParams: { purpose: 'RESET_PASSWORD' } });
      },
      error: (err) => {
        this.loading = false;
        const message = apiMessage(err, '');
        this.errorKey = this.locale.messageKey(message) ?? '';
        this.errorRaw = this.errorKey ? '' : message || this.locale.t('auth.otp.sendFailed');
      },
    });
  }
}
