import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import type { CatalogPackage, ProviderSubscriptionResponse } from '../core/models';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-package',
  imports: [RouterLink],
  template: `
    <div class="grid two">
      <article class="card package">
        <span class="badge">الباقة الحالية</span>
        <h2 style="font:700 25px 'Noto Naskh Arabic';color:var(--plum)">
          {{ currentName }}
        </h2>
        <div class="price">
          {{ currentPrice }}
          <small style="font-size:12px">ر.س</small>
        </div>
        <p style="color:var(--muted);font-size:10px">{{ currentHint }}</p>
        <div class="progress"><span [style.width.%]="progress"></span></div>
        <div style="display:flex;gap:9px;margin-top:20px">
          <a class="btn primary" [routerLink]="['/p/payment']" [queryParams]="{ packageId: selectedId }">إرسال إثبات السداد</a>
        </div>
      </article>
      <article class="card">
        <h3 style="color:var(--plum)">الباقات المتاحة</h3>
        @for (item of data?.packages ?? []; track item.id) {
          <button class="feature" type="button" (click)="selectedId = item.id" [style.fontWeight]="selectedId === item.id ? '700' : '400'">
            <i>✓</i>{{ locale.localizedName(item) }} · {{ item.price ?? 0 }} ر.س
          </button>
        }
        @if (!data?.packages?.length) {
          <p style="color:var(--muted);font-size:11px">ستظهر الباقات عند اتصال الـ API.</p>
        }
      </article>
    </div>
    @if (data?.proofs?.length) {
      <div class="section-head">
        <div>
          <h2>سجل الاشتراك</h2>
          <p>تفاصيل عملياتك السابقة</p>
        </div>
      </div>
      @for (proof of data!.proofs; track proof.id) {
        <article class="card provider">
          <div class="provider-photo">✓</div>
          <div>
            <h3>{{ locale.localizedName(proof.subscription.package) }}</h3>
            <p>{{ proof.opsStatus }} / {{ proof.financeStatus }} · {{ proof.amount }} ر.س</p>
          </div>
        </article>
      }
    }
  `,
})
export class ProviderPackageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  data: ProviderSubscriptionResponse | null = null;
  selectedId = '';

  get current(): CatalogPackage | undefined {
    return this.data?.current?.package ?? this.data?.packages?.[0];
  }

  get currentName(): string {
    return this.current ? this.locale.localizedName(this.current) : 'بدون باقة نشطة';
  }

  get currentPrice(): string | number {
    return this.current?.price ?? 0;
  }

  get currentHint(): string {
    if (!this.data?.current) {
      return 'اختاري باقة لتفعيل الظهور للباحثات.';
    }
    return `${this.data.current.status} · ${String(this.data.current.endAt).slice(0, 10)}`;
  }

  get progress(): number {
    return this.data?.current?.status === 'ACTIVE' ? 72 : 20;
  }

  ngOnInit(): void {
    this.shell.set('باقتي واشتراكي', 'تابعي الباقة أو اطلبي التمديد والترقية');
    this.api.providerSubscription().subscribe({
      next: (data) => {
        this.data = data;
        this.selectedId = data.current?.package.id || data.packages[0]?.id || '';
      },
    });
  }
}
