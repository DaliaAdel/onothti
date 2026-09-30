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
      <div class="page-head"><div><h1>الميزة غير متاحة</h1><p>يجب تفعيل الاشتراك أولًا</p></div></div>
      <div class="card subscription-lock">
        <div class="symbol">♢</div>
        <h2>اشتركي لتفعيل أدوات الخبيرة</h2>
        <p class="muted">بعد اختيار الباقة واعتماد الدفع يمكنكِ إضافة الخدمات ورفع الألبومات واستخدام الإحصاءات والتقييمات.</p>
        <a class="btn primary" routerLink="/p/package">عرض الباقات</a>
      </div>
    } @else {
      <div class="page-head">
        <div>
          <h1>المشاهدات والإحصاءات</h1>
          <p>تابعي أداء ملفك وخدماتك</p>
        </div>
      </div>
      <div class="grid cols-3">
        <div class="card metric">
          <span class="muted small">إجمالي المشاهدات</span>
          <div class="value">{{ data?.total ?? 0 }}</div>
        </div>
        <div class="card metric">
          <span class="muted small">مشاهدات آخر 7 أيام</span>
          <div class="value">{{ last7 }}</div>
        </div>
        <div class="card metric">
          <span class="muted small">أيام بها زيارات</span>
          <div class="value">{{ data?.items?.length ?? 0 }}</div>
        </div>
      </div>
      <br />
      <div class="card">
        <h3>مشاهدات الملف خلال آخر 7 أيام</h3>
        @if (chartBars.length) {
          <div class="chart-summary">
            <span><b>{{ last7 }}</b> إجمالي المشاهدات</span>
          </div>
          <div class="chart-layout">
            <div class="chart-scale"><span>أعلى</span><span></span><span></span><span></span><span>0</span></div>
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
          <p class="muted small">لا توجد مشاهدات بعد.</p>
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
    this.shell.set('المشاهدات والإحصاءات');
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
