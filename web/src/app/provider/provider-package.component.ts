import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import { LocaleService } from '../core/locale.service';
import { ToastService } from '../core/toast.service';
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
        <h1>{{ locale.t('p.pkg.title') }}</h1>
        <p>{{ locale.t('p.pkg.sub') }}</p>
      </div>
    </div>
    @if (current && live) {
      <div class="active-package">
        <div>
          <span class="status success">{{ locale.t('p.pkg.active') }}</span>
          <h3>{{ locale.localizedName(current.package) }}</h3>
          <p>{{ locale.tf('p.pkg.untilStatus', { status: current.status, date: endAt }) }}</p>
        </div>
      </div>
    }
    <div class="packages-intro">
      <div>
        <b>{{ locale.t('p.pkg.list') }}</b>
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
            @if (hasDiscount(item)) {
              <div class="price-row">
                <span>{{ locale.t('p.pkg.before') }}</span>
                <del>{{ money(item.priceBefore) }} {{ locale.t('ui.sar') }}</del>
              </div>
              <div class="price-row">
                <span>{{ locale.t('p.pkg.discount') }}</span>
                <b>{{ money(item.discountPercent) }}%</b>
              </div>
            }
            <div class="price-row final">
              <span>{{ hasDiscount(item) ? locale.t('p.pkg.after') : locale.t('p.pkg.value') }}</span>
              <strong>{{ priceOf(item) }}</strong>
            </div>
            <details class="package-policy">
              <summary>{{ locale.t('p.pkg.details') }}</summary>
              <div class="package-policy-body">
                <p><b>{{ locale.t('p.pkg.duration') }}</b> {{ policyOf(item).duration }}</p>
                <p><b>{{ locale.t('p.pkg.limits') }}</b> {{ policyOf(item).limits }}</p>
                <h4>{{ locale.t('p.pkg.features') }}</h4>
                <ul>
                  @for (feature of policyOf(item).features; track feature) {
                    <li>{{ feature }}</li>
                  }
                </ul>
                <h4>{{ locale.t('p.pkg.policy') }}</h4>
                <p>{{ policyOf(item).policy }}</p>
              </div>
            </details>
            <div class="package-feature"><span>✓</span> {{ locale.t('p.pkg.unlock') }}</div>
            @if (isCampaignPackage(item)) {
              <button class="btn package-action" type="button" (click)="join(item)">{{ locale.t('p.pkg.campaign') }}</button>
            } @else if (item.code === 'FREE') {
              <button class="btn package-action" type="button" disabled>{{ locale.t('p.pkg.opsOnly') }}</button>
            } @else {
              <button class="btn package-action" type="button" (click)="choose(item)">{{ locale.t('p.pkg.choose') }}</button>
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
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);
  data: ProviderSubscriptionResponse | null = null;

  get packages(): CatalogPackage[] {
    const livePromoId = this.data?.campaign?.packageId;
    return [...(this.data?.packages ?? [])]
      .filter((item) => !item.isPromotional || item.id === livePromoId)
      .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
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
    this.shell.set('nav.package');
    this.api.providerSubscription().subscribe({ next: (data) => (this.data = data) });
  }

  colorOf(item: CatalogPackage): string {
    return PACKAGE_COLORS[item.code] || '#8C4A35';
  }

  durationOf(item: CatalogPackage): string {
    const code = PACKAGE_POLICIES[item.code] ? item.code : '';
    if (code) {
      return this.locale.t(`p.pkg.pol.${code}.duration`);
    }
    return item.durationMonths
      ? this.locale.tf('p.pkg.months', { n: item.durationMonths })
      : this.locale.t('p.pkg.flex');
  }

  money(value: number | string | null | undefined): number {
    const next = Number(value ?? 0);
    return Number.isFinite(next) ? next : 0;
  }

  hasDiscount(item: CatalogPackage): boolean {
    return this.money(item.discountPercent) > 0;
  }

  isCampaignPackage(item: CatalogPackage): boolean {
    return Boolean(this.data?.campaign?.packageId && this.data.campaign.packageId === item.id);
  }

  priceOf(item: CatalogPackage): string {
    const price = this.money(item.price);
    if (item.code === 'FREE' || price === 0) {
      return this.locale.t('p.pkg.free');
    }
    return `${price} ${this.locale.t('ui.sar')}`;
  }

  policyOf(item: CatalogPackage): { duration: string; limits: string; policy: string; features: string[] } {
    const code = PACKAGE_POLICIES[item.code] ? item.code : 'GREEN';
    const counts: Record<string, number> = { FREE: 6, GREEN: 6, BRONZE: 7, SILVER: 7, GOLD: 8 };
    const n = counts[code] ?? 6;
    return {
      duration: this.locale.t(`p.pkg.pol.${code}.duration`),
      limits: this.locale.t(`p.pkg.pol.${code}.limits`),
      policy: this.locale.t(`p.pkg.pol.${code}.policy`),
      features: Array.from({ length: n }, (_, i) => this.locale.t(`p.pkg.pol.${code}.f${i + 1}`)),
    };
  }

  choose(item: CatalogPackage): void {
    void this.router.navigate(['/p/payment'], { queryParams: { packageId: item.id } });
  }

  join(item: CatalogPackage): void {
    this.api.joinCampaign(item.id).subscribe({
      next: () => {
        this.toast.show(this.locale.tf('p.pkg.campaignOk', { name: this.locale.localizedName(item) }));
        this.api.providerSubscription().subscribe({ next: (data) => (this.data = data) });
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('p.pkg.campaignFail'))),
    });
  }
}
