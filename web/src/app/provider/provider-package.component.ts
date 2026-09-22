import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { CatalogPackage } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-package',
  imports: [RouterLink],
  template: `
    <div class="grid two">
      <article class="card package">
        <span class="badge">الباقة الحالية</span>
        <h2 style="font:700 25px 'Noto Naskh Arabic';color:var(--plum)">{{ current?.nameAr || 'بدون باقة نشطة' }}</h2>
        <div class="price">
          {{ current ? current.monthlyPrice ?? '—' : '0' }}
          <small style="font-size:12px">ر.س / شهر</small>
        </div>
        <p style="color:var(--muted);font-size:10px">اختاري باقة لتفعيل الظهور للباحثات.</p>
        <div class="progress"><span style="width:20%"></span></div>
        <div style="display:flex;gap:9px;margin-top:20px">
          <a class="btn primary" routerLink="/p/payment">إرسال إثبات السداد</a>
          <button class="btn ghost" type="button" (click)="toast.show('خيارات الترقية ستظهر بعد ربط الاشتراكات')">ترقية الباقة</button>
        </div>
      </article>
      <article class="card">
        <h3 style="color:var(--plum)">الباقات المتاحة</h3>
        @for (item of packages; track item.id) {
          <div class="feature"><i>✓</i>{{ item.nameAr }} · {{ item.code }}</div>
        }
        @if (packages.length === 0) {
          <p style="color:var(--muted);font-size:11px">ستظهر الباقات عند اتصال الـ API.</p>
        }
      </article>
    </div>
  `,
})
export class ProviderPackageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly toast = inject(ToastService);
  packages: CatalogPackage[] = [];

  get current(): CatalogPackage | undefined {
    return this.packages[0];
  }

  ngOnInit(): void {
    this.shell.set('باقتي واشتراكي', 'تابعي الباقة أو اطلبي التمديد والترقية');
    this.api.packages().subscribe({ next: (packages) => (this.packages = packages) });
  }
}
