import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SAUDI_MOBILE_MESSAGE, isSaudiMobile, toMobile } from '../core/phone';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box signup-details" (ngSubmit)="submit()">
        <a routerLink="/login" class="back-link">→ لديّ حساب بالفعل</a>
        <span class="eyebrow">إنشاء حساب جديد</span>
        <h1>ابدئي رحلتكِ مع أنوثتي</h1>
        <p class="sub">أنشئي بيانات الدخول أولًا، ثم اختاري نوع الحساب وأكّدي رقم الجوال.</p>
        <div class="form-grid">
          <div class="field full">
            <label>الاسم</label>
            <input class="input" name="name" [(ngModel)]="displayName" required autocomplete="name" placeholder="اكتبي الاسم الكامل" />
          </div>
          <div class="field full">
            <label>رقم الجوال</label>
            <input
              class="input"
              name="phone"
              [(ngModel)]="phone"
              required
              inputmode="numeric"
              maxlength="14"
              autocomplete="tel"
              placeholder="0501234567"
              dir="ltr"
            />
          </div>
          <div class="field full">
            <label>البريد الإلكتروني <span style="font-weight:400;color:var(--muted)">(اختياري)</span></label>
            <input class="input" name="email" type="email" [(ngModel)]="email" autocomplete="email" placeholder="name@example.com" dir="ltr" />
          </div>
          <div class="field">
            <label>كلمة المرور</label>
            <input class="input" name="password" type="password" [(ngModel)]="password" required minlength="8" autocomplete="new-password" placeholder="8 أحرف على الأقل" />
          </div>
          <div class="field">
            <label>تأكيد كلمة المرور</label>
            <input class="input" name="confirm" type="password" [(ngModel)]="confirm" required minlength="8" autocomplete="new-password" placeholder="أعيدي كتابة كلمة المرور" />
          </div>
        </div>
        <label class="terms-row">
          <input type="checkbox" name="terms" [(ngModel)]="terms" />
          أوافق على
          <a routerLink="/legal/terms" [queryParams]="{ audience: 'CUSTOMER' }">شروط الاستخدام</a>
          و
          <a routerLink="/legal/policies" [queryParams]="{ audience: 'CUSTOMER' }">سياسة الخصوصية</a>.
        </label>
        @if (error) {
          <p class="auth-error">{{ error }}</p>
        }
        <button class="btn primary full" style="margin-top:16px" type="submit">
          إنشاء الحساب والمتابعة
          <app-icon name="arrow" />
        </button>
        <div class="auth-note step-row">
          <b>1</b><span>بيانات الحساب</span>
          <b>2</b><span>اختيار نوع الحساب</span>
          <b>3</b><span>تأكيد رقم الجوال</span>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class SignupComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  displayName = '';
  phone = '';
  email = '';
  password = '';
  confirm = '';
  terms = false;
  error = '';

  submit(): void {
    const mobile = toMobile(this.phone);
    if (this.displayName.trim().length < 2) {
      this.error = 'أدخلي الاسم الكامل';
      return;
    }
    if (!isSaudiMobile(mobile)) {
      this.error = SAUDI_MOBILE_MESSAGE;
      return;
    }
    if (this.password.length < 8) {
      this.error = 'كلمة المرور لا تقل عن 8 أحرف';
      return;
    }
    if (this.password !== this.confirm) {
      this.error = 'كلمة المرور وتأكيدها غير متطابقين';
      return;
    }
    if (!this.terms) {
      this.error = 'وافقي على الشروط للمتابعة';
      return;
    }
    this.session.saveDraft({
      displayName: this.displayName.trim(),
      mobile,
      email: this.email.trim() || undefined,
      password: this.password,
    });
    this.toast.show('اختاري نوع الحساب للمتابعة');
    void this.router.navigateByUrl('/signup/type');
  }
}
