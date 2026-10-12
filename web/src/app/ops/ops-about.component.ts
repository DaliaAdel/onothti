import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-ops-about',
  imports: [RouterLink],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>حول المنصة</h2>
        <p>منصة الأنوثة والجمال لإدارة الحسابات والخدمات بأمان.</p>
      </div>
    </div>
    <article class="card" style="text-align:center;padding:32px 22px">
      <img src="/assets/logo.png" alt="أنوثتي" style="width:92px;height:auto;margin-bottom:12px" />
      <h2 style="margin:0 0 8px">منصة الأنوثة والجمال</h2>
      <p class="muted">تربط العميلات بالخبيرات وتسهّل إدارة الحسابات والاعتمادات من لوحة  المعلومات.</p>
      <span class="status success">الإصدار 1.0.0</span>
      <div class="hero-actions" style="margin-top:18px;justify-content:center">
        <a class="btn ghost" routerLink="/legal/policies" [queryParams]="{ audience: 'STAFF' }">سياسة الخصوصية</a>
        <a class="btn ghost" routerLink="/legal/terms" [queryParams]="{ audience: 'STAFF' }">شروط وأحكام المنصة</a>
      </div>
      <p class="muted small" style="margin-top:16px">تواصل معنا: <b dir="ltr">info&#64;onothti.com</b></p>
    </article>
  `,
})
export class OpsAboutComponent implements OnInit {
  private readonly shell = inject(ShellService);

  ngOnInit(): void {
    this.shell.set('حول المنصة', 'منصة الأنوثة والجمال');
  }
}
