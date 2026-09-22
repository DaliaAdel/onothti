import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../core/session.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-account-type',
  imports: [RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout>
      <div class="auth-box">
        <a routerLink="/signup" class="back-link">→ العودة لتعديل البيانات</a>
        <span class="eyebrow">إنشاء الحساب · 2 من 3</span>
        <h1>كيف ستستخدمين أنوثتي؟</h1>
        <p class="sub">اختاري نوع الحساب مرة واحدة. سيحدد النظام الواجهة المناسبة لكِ عند كل تسجيل دخول.</p>
        <div class="account-type-grid">
          <button class="account-type-card" type="button" (click)="choose('CUSTOMER')">
            <span class="type-icon"><app-icon name="search" /></span>
            <div>
              <h3>باحثة عن الأنوثة</h3>
              <p>أبحث عن خدمات التجميل وصانعات الجمال في مدينتي.</p>
            </div>
            <span class="type-arrow"><app-icon name="chev" /></span>
          </button>
          <button class="account-type-card" type="button" (click)="choose('PROVIDER')">
            <span class="type-icon"><app-icon name="spark" /></span>
            <div>
              <h3>صانعة جمال</h3>
              <p>أعرض خدماتي وأعمالي وأتواصل مع الباحثات عن الأنوثة.</p>
            </div>
            <span class="type-arrow"><app-icon name="chev" /></span>
          </button>
        </div>
        <div class="auth-note">
          <b>✓</b>
          <span>يمكن لكل رقم هاتف الارتباط بنوع حساب واحد وفق بيانات التسجيل.</span>
        </div>
      </div>
    </app-auth-layout>
  `,
})
export class AccountTypeComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  choose(accountType: 'CUSTOMER' | 'PROVIDER'): void {
    const draft = this.session.getDraft();
    if (!draft) {
      void this.router.navigateByUrl('/signup');
      return;
    }
    this.session.saveDraft({ ...draft, accountType });
    void this.router.navigateByUrl(accountType === 'CUSTOMER' ? '/signup/customer' : '/signup/provider');
  }
}
