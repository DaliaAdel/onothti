import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-customer-about',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>حول المنصة</h1>
        <p>منصة تجمع العميلات والخبيرات وتسهّل اكتشاف خدمات الجمال والتواصل بشأنها.</p>
      </div>
    </div>
    <div class="grid two">
      <article class="card">
        <h3>اختيارات متنوعة</h3>
        <p class="muted small">خدمات وتخصصات متعددة تساعدكِ على إيجاد ما يناسب احتياجكِ.</p>
      </article>
      <article class="card">
        <h3>نتائج حسب موقعكِ</h3>
        <p class="muted small">حددي المنطقة والمدينة للوصول إلى الخبيرات القريبات منكِ.</p>
      </article>
      <article class="card">
        <h3>ملفات واضحة</h3>
        <p class="muted small">شاهدي الخدمات ونماذج الأعمال والتقييمات قبل التواصل.</p>
      </article>
      <article class="card">
        <h3>تواصل مباشر</h3>
        <p class="muted small">رحلة بسيطة من البحث وحتى بدء التواصل مع الخبيرة عبر واتساب خارج المنصة.</p>
      </article>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>المساعدة والسياسات</h3>
      <p class="muted small">راجعي الصفحات القانونية أو افتحي طلبًا من طلباتي عند الحاجة.</p>
      <div class="hero-actions" style="margin-top:14px">
        <a class="btn ghost" routerLink="/legal/policies" [queryParams]="{ audience: 'CUSTOMER' }">سياسة الخصوصية</a>
        <a class="btn ghost" routerLink="/legal/terms" [queryParams]="{ audience: 'CUSTOMER' }">الشروط والأحكام</a>
        <a class="btn primary" routerLink="/c/requests">طلباتي</a>
      </div>
    </div>
  `,
})
export class CustomerAboutComponent implements OnInit {
  private readonly shell = inject(ShellService);

  ngOnInit(): void {
    this.shell.set('حول المنصة', 'منصة الأنوثة والجمال');
  }
}
