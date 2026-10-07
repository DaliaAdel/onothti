import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-login',
  imports: [RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <div class="auth-box">
        <a class="auth-back" routerLink="/">← الرئيسية</a>
        <span class="auth-kicker">مرحبًا بكِ</span>
        <h2>اختاري طريقة المتابعة</h2>
        <p class="muted">سجّلي الدخول إلى حسابك أو ابدئي إنشاء حساب جديد.</p>
        <div class="entry-options">
          <a class="entry-card" routerLink="/login/phone">
            <span class="entry-icon">✓</span>
            <b>لدي حساب</b>
            <small>الدخول برقم الجوال ورمز التحقق</small>
          </a>
          <a class="entry-card" routerLink="/signup">
            <span class="entry-icon">＋</span>
            <b>مستخدم جديد</b>
            <small>إنشاء حساب لأول مرة</small>
          </a>
        </div>
      </div>
    </app-auth-layout>
  `,
})
export class LoginComponent {}
