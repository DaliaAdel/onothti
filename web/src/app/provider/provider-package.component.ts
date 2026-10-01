import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import {
  PACKAGE_COLORS,
  PACKAGE_POLICIES,
  isLiveSubscription,
  type CatalogPackage,
  type ProviderSubscriptionResponse,
} from '../core/models';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-package',
  template: `
    <div class="page-head">
      <div>
        <h1>الاشتراك والباقات</h1>
        <p>اختاري الباقة المناسبة، وتُفتح الخدمات والألبومات بعد اعتماد الدفع</p>
      </div>
    </div>
    @if (current && live) {
      <div class="active-package">
        <div>
          <span class="status success">الباقة مفعّلة</span>
          <h3>{{ locale.localizedName(current.package) }}</h3>
          <p>{{ current.status }} · حتى {{ endAt }}</p>
        </div>
      </div>
    }
    <div class="packages-intro">
      <div>
        <b>باقات الخبيرة</b>
      </div>
    </div>
    <div class="grid package-grid">
      @for (item of packages; track item.id) {
        <div class="package-card" [style.--package-color]="colorOf(item)">
          <div class="package-head">
            <span class="package-icon">◇</span>
            <div>
              <h2>{{ locale.localizedName(item) }}</h2>
              <small>{{ durationOf(item) }}</small>
            </div>
          </div>
          <div class="package-body">
            <div class="price-row final">
              <span>قيمة الباقة</span>
              <strong>{{ priceOf(item) }}</strong>
            </div>
            <details class="package-policy">
              <summary>تفاصيل وسياسة الباقة</summary>
              <div class="package-policy-body">
                <p><b>المدة:</b> {{ policyOf(item).duration }}</p>
                <p><b>الحدود:</b> {{ policyOf(item).limits }}</p>
                <h4>المميزات</h4>
                <ul>
                  @for (feature of policyOf(item).features; track feature) {
                    <li>{{ feature }}</li>
                  }
                </ul>
                <h4>سياسة الباقة</h4>
                <p>{{ policyOf(item).policy }}</p>
              </div>
            </details>
            <div class="package-feature"><span>✓</span> تفعيل الخدمات والألبومات بعد اعتماد الاشتراك</div>
            @if (item.code === 'FREE') {
              <button class="btn package-action" type="button" disabled>تُفعّل من إدارة المنصة</button>
            } @else {
              <button class="btn package-action" type="button" (click)="choose(item)">اختيار الباقة والاشتراك</button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ProviderPackageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly router = inject(Router);
  readonly locale = inject(LocaleService);
  data: ProviderSubscriptionResponse | null = null;

  get packages(): CatalogPackage[] {
    return [...(this.data?.packages ?? [])].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  }

  get current() {
    return this.data?.current ?? null;
  }

  get live(): boolean {
    return isLiveSubscription(this.current);
  }

  get endAt(): string {
    return this.current?.endAt ? this.current.endAt.slice(0, 10) : '';
  }

  ngOnInit(): void {
    this.shell.set('الاشتراك والباقات');
    this.api.providerSubscription().subscribe({ next: (data) => (this.data = data) });
  }

  colorOf(item: CatalogPackage): string {
    return PACKAGE_COLORS[item.code] || '#8C4A35';
  }

  durationOf(item: CatalogPackage): string {
    return PACKAGE_POLICIES[item.code]?.duration || (item.durationMonths ? `${item.durationMonths} شهر` : 'مدة مرنة');
  }

  priceOf(item: CatalogPackage): string {
    const price = Number(item.price ?? 0);
    if (item.code === 'FREE' || price === 0) {
      return 'بدون مقابل';
    }
    return `${price} ر.س`;
  }

  policyOf(item: CatalogPackage) {
    return PACKAGE_POLICIES[item.code] || PACKAGE_POLICIES['GREEN'];
  }

  choose(item: CatalogPackage): void {
    void this.router.navigate(['/p/payment'], { queryParams: { packageId: item.id } });
  }
}
