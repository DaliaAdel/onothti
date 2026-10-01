import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-account-type',
  imports: [RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <div class="auth-box">
        <a class="auth-back" routerLink="/login">← رجوع</a>
        <span class="auth-kicker">مستخدم جديد</span>
        <h2>اختاري نوع الحساب</h2>
        <p class="muted">اختاري نوع الحساب المناسب لكِ لاستكمال التسجيل.</p>
        <div class="entry-options role-options">
          <a class="entry-card" routerLink="/signup/phone">
            <span class="entry-icon">✦</span>
            <b>الخبيرة</b>
            <small>لعرض الخدمات والأعمال والاشتراك في الباقات</small>
          </a>
          <button class="entry-card unavailable-role" type="button" disabled aria-disabled="true">
            <span class="entry-icon">♡</span>
            <b>العميلة</b>
            <small>للبحث عن الخدمات والخبيرات</small>
          </button>
        </div>
      </div>
    </app-auth-layout>
  `,
})
export class AccountTypeComponent {}
