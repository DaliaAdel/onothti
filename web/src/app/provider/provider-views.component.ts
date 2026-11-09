import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { isLiveSubscription, type ProviderViews } from '../core/models';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-views',
  imports: [RouterLink],
  template: `
    @if (locked) {
      <div class="page-head"><div><h1>{{ locale.t('p.locked.title') }}</h1><p>{{ locale.t('p.locked.sub') }}</p></div></div>
      <div class="card subscription-lock">
        <div class="symbol">♢</div>
        <h2>{{ locale.t('p.locked.ctaTitle') }}</h2>
        <p class="muted">{{ locale.t('p.locked.ctaText') }}</p>
        <a class="btn primary" routerLink="/p/package">{{ locale.t('p.locked.viewPackages') }}</a>
      </div>
    } @else {
      <div class="page-head">
        <div>
          <h1>{{ locale.t('p.viewsTitle') }}</h1>
          <p>{{ locale.t('p.views.sub') }}</p>
        </div>
      </div>
      <div class="grid cols-3">
        <div class="card metric">
          <span class="muted small">{{ locale.t('p.views.total') }}</span>
          <div class="value">{{ data?.total ?? 0 }}</div>
        </div>
        <div class="card metric">
          <span class="muted small">{{ locale.t('p.views.last7') }}</span>
          <div class="value">{{ last7 }}</div>
        </div>
        <div class="card metric">
          <span class="muted small">{{ locale.t('p.views.conv') }}</span>
          <div class="value">{{ data?.items?.length ?? 0 }}</div>
        </div>
      </div>
      <br />
      <div class="card">
        <h3>{{ locale.t('p.views.chart') }}</h3>
        @if (chartBars.length) {
          <div class="chart-summary">
            <span><b>{{ last7 }}</b> {{ locale.t('p.views.total') }}</span>
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
          <p class="muted small">{{ locale.t('p.views.empty') }}</p>
        }
      </div>
    }
  `,
})
export class ProviderViewsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  data: ProviderViews | null = null;
  locked = false;

  ngOnInit(): void {
    this.shell.set('p.viewsTitle');
    this.api.providerSubscription().subscribe({
      next: (sub) => (this.locked = !isLiveSubscription(sub.current)),
    });
    this.api.providerViews().subscribe({ next: (data) => (this.data = data) });
  }

  get last7(): number {
    return (this.data?.items ?? []).slice(-7).reduce((sum, item) => sum + item.viewCount, 0);
  }

  get chartBars() {
    const items = (this.data?.items ?? []).slice(-7);
    const max = Math.max(1, ...items.map((item) => item.viewCount));
    return items.map((item) => ({
      label: this.locale.localizedName(item.city, String(item.date).slice(5, 10)),
      value: item.viewCount,
      height: Math.round((item.viewCount / max) * 100),
    }));
  }
}
