import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { isLiveSubscription, type ProviderDashboard, type ProviderViews } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-dashboard',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ name || locale.t('p.homeFallback') }}</h1>
        <p>{{ live ? locale.t('p.summaryLive') : locale.t('p.summaryIdle') }}</p>
      </div>
    </div>
    @if (!live) {
      <a class="subscription-note dashboard-subscription" routerLink="/p/package">
        <b>{{ locale.t('p.unsubscribed') }}</b>
        <span>{{ locale.t('p.unsubscribedText') }}</span>
      </a>
    } @else if (packageName) {
      <div class="active-package">
        <div>
          <span class="status success">{{ locale.t('p.active') }}</span>
          <h3>{{ packageTitle }}</h3>
          <p>{{ locale.tf('p.remaining', { n: remainingDays }) }}{{ endLabel }}.</p>
        </div>
        <div class="remaining-days dash-remaining">
          <span>{{ locale.t('p.daysLeft') }}</span>
          <strong>{{ remainingDays }}</strong>
        </div>
        <a class="btn secondary" routerLink="/p/package">{{ locale.t('p.manageSub') }}</a>
      </div>
    }
    <div class="section-title"><h3>{{ locale.t('p.stats') }}</h3></div>
    <div class="grid cols-3">
      @for (metric of accountMetrics; track metric.label) {
        <div class="card metric">
          <span class="muted small">{{ metric.label }}</span>
          <div class="value">{{ metric.value }}</div>
          @if (metric.stars) {
            <span class="stars">{{ metric.stars }}</span>
          } @else if (metric.trend) {
            <span class="delta">{{ metric.trend }}</span>
          }
        </div>
      }
    </div>
    <div class="section-title" style="margin-top:18px"><h3>{{ locale.t('p.opportunities') }}</h3></div>
    <div class="grid cols-2">
      @for (metric of platformMetrics; track metric.label) {
        <div class="card metric">
          <span class="muted small">{{ metric.label }}</span>
          <div class="value">{{ metric.value }}</div>
          <span class="delta">{{ metric.trend }}</span>
        </div>
      }
    </div>
    <br />
    @if (live) {
      <div class="grid wide-side">
        <div class="card">
          <h3>{{ locale.t('p.views7') }}</h3>
          @if (chartBars.length) {
            <div class="chart-summary">
              <span><b>{{ chartTotal }}</b> {{ locale.t('p.viewsTotal') }}</span>
            </div>
            <div class="chart-layout">
              <div class="chart-scale"><span>{{ locale.t('p.high') }}</span><span></span><span></span><span></span><span>0</span></div>
              <div class="chart clear-chart">
                @for (bar of chartBars; track bar.label) {
                  <div class="bar-item">
                    <span class="bar-value">{{ bar.value }}</span>
                    <div class="bar" [style.height.%]="bar.height"></div>
                    <span class="bar-day">{{ bar.label }}</span>
                  </div>
                }
              </div>
            </div>
          } @else {
            <p class="muted small">{{ locale.t('p.viewsEmpty') }}</p>
          }
        </div>
        <div class="card">
          <span class="status success">{{ locale.t('p.accountActive') }}</span>
          <h3 style="margin-top:14px">{{ locale.t('p.profileVisible') }}</h3>
          <p class="small muted">{{ locale.t('p.profileVisibleText') }}</p>
          <a class="btn primary" routerLink="/p/services">{{ locale.t('p.manageServices') }}</a>
        </div>
      </div>
    } @else {
      <div class="card empty">
        <div class="symbol">◇</div>
        <h3>{{ locale.t('p.pickPackage') }}</h3>
        <p class="small muted">{{ locale.t('p.pickPackageText') }}</p>
        <a class="btn primary" routerLink="/p/package">{{ locale.t('p.viewPackages') }}</a>
      </div>
    }
  `,
})
export class ProviderDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  data: ProviderDashboard | null = null;
  views: ProviderViews | null = null;

  ngOnInit(): void {
    this.shell.set('p.home');
    this.api.providerDashboard().subscribe({
      next: (data) => {
        this.data = data;
        this.session.patchUser({
          displayName: data.profile.displayName,
          status: data.profile.status,
          city: data.profile.city,
        });
      },
    });
    this.api.providerViews().subscribe({ next: (views) => (this.views = views) });
  }

  get live(): boolean {
    return isLiveSubscription(this.data?.subscription);
  }

  get name(): string {
    return this.data?.profile.displayName || this.session.user()?.displayName || '';
  }

  get packageName(): string {
    const pkg = this.data?.subscription?.package;
    return pkg ? this.locale.localizedName(pkg) : '';
  }

  get packageTitle(): string {
    const name = this.packageName;
    if (!name) {
      return '';
    }
    return name.includes('باقة') || name.toLowerCase().includes('package') ? name : `${this.locale.t('p.packagePrefix')}${name}`;
  }

  get endLabel(): string {
    const end = this.data?.subscription?.endAt;
    if (!end) {
      return '';
    }
    const date = new Date(end);
    if (Number.isNaN(date.getTime())) {
      return `${this.locale.t('p.until')}${end.slice(0, 10)}`;
    }
    return `${this.locale.t('p.until')}${this.locale.formatDateTime(date, false)}`;
  }

  get remainingDays(): number {
    const end = this.data?.subscription?.endAt;
    if (!end) {
      return 0;
    }
    const date = new Date(end);
    if (Number.isNaN(date.getTime())) {
      return 0;
    }
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
  }

  get accountMetrics() {
    const stats = this.data?.stats;
    if (!this.live) {
      return [
        { label: this.locale.t('p.metric.fileViews'), value: '0', trend: this.locale.t('p.metric.afterPackage') },
        { label: this.locale.t('p.metric.contacts'), value: '0', trend: this.locale.t('p.metric.afterPackage') },
        { label: this.locale.t('p.metric.ratingLabel'), value: '—', trend: this.locale.t('p.metric.noRatings') },
      ];
    }
    const rating = stats?.ratingAvg;
    return [
      { label: this.locale.t('p.metric.fileViews'), value: this.formatCount(stats?.views30d ?? 0), trend: '' },
      { label: this.locale.t('p.metric.contacts'), value: '0', trend: '' },
      {
        label: this.locale.t('p.metric.ratingLabel'),
        value: rating != null ? String(rating) : '—',
        trend: '',
        stars: rating != null ? '★★★★★' : '',
      },
    ];
  }

  get platformMetrics() {
    return [{ label: this.locale.t('p.metric.clients'), value: '—', trend: this.locale.t('p.metric.clientsTrend') }];
  }

  private formatCount(value: number): string {
    return value.toLocaleString('en-US');
  }

  get chartBars() {
    const items = (this.views?.items ?? []).slice(-7);
    const max = Math.max(1, ...items.map((item) => item.viewCount));
    return items.map((item) => ({
      label: String(item.date).slice(5, 10),
      value: item.viewCount,
      height: Math.round((item.viewCount / max) * 100),
    }));
  }

  get chartTotal(): number {
    return this.chartBars.reduce((sum, bar) => sum + bar.value, 0);
  }
}
