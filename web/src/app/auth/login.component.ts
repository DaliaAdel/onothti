import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
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
        <span class="eyebrow">تسجيل الدخول الآمن</span>
        <h1>أهلًا بكِ من جديد</h1>
        <p class="sub">أدخلي رقم الجوال وكلمة المرور المرتبطة بحسابك، وسيتعرّف النظام على نوع الحساب تلقائيًا.</p>
        <div class="field">
          <label>رقم الهاتف</label>
          <div class="phone-field">
            <span>+966</span>
            <input
              name="phone"
              [ngModel]="phone"
              (ngModelChange)="phone = toLocalPhone($event)"
              (paste)="onPhonePaste($event)"
              inputmode="numeric"
              maxlength="9"
              placeholder="5X XXX XXXX"
              aria-label="رقم الهاتف"
            />
          </div>
        </div>
        <div class="field" style="margin-top:12px">
          <label>كلمة المرور</label>
          <input class="input" name="password" type="password" [(ngModel)]="password" placeholder="8 أحرف على الأقل" />
        </div>
        @if (error) {
          <p class="auth-error">{{ error }}</p>
        }
        <button class="btn primary full" style="margin-top:16px" type="submit" [disabled]="loading">
          متابعة
          <app-icon name="arrow" />
        </button>
        <div class="divider">أول مرة على أنوثتي؟</div>
        <a class="btn ghost full" routerLink="/signup">إنشاء حساب جديد</a>
        <div class="auth-note">
          <b>✓</b>
          <span>نوع الحساب محفوظ ضمن بياناتك، لذلك سيتم توجيهكِ تلقائيًا بعد التحقق.</span>
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

  phone = '';
  password = '';
  loading = false;
  error = '';
  readonly toLocalPhone = toLocalPhone;

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.phone = toLocalPhone(event.clipboardData?.getData('text') ?? '');
  }

  submit(): void {
    const mobile = toMobile(this.phone);
    if (!isSaudiMobile(mobile)) {
      this.error = 'أدخلي رقم هاتف صحيحًا من 9 أرقام';
      return;
    }
    if (this.password.length < 8) {
      this.error = 'كلمة المرور لا تقل عن 8 أحرف';
      return;
    }
    this.loading = true;
    this.error = '';
    this.session.setLoginMobile(mobile);
    this.api.login(mobile, this.password).subscribe({
      next: (res) => {
        this.session.setSession(res.accessToken, res.user);
        this.toast.show('أهلًا بكِ من جديد');
        void this.router.navigateByUrl(this.session.homeFor(res.user.accountType));
      },
      error: (err) => {
        this.loading = false;
        const message = apiMessage(err, 'تعذر تسجيل الدخول');
        if (message.includes('رمز التحقق')) {
          this.session.saveDraft({
            displayName: '',
            mobile,
            password: this.password,
          });
          this.toast.show('أكّدي رقم الجوال أولًا');
          void this.router.navigate(['/otp'], { queryParams: { purpose: 'REGISTER' } });
          return;
        }
        this.error = message;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
