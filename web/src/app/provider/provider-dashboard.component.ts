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
        <h1>مرحبًا{{ name ? '، ' + name : '' }}</h1>
        <p>{{ live ? 'هذا ملخص أداء حسابك اليوم' : 'يمكنكِ تصفح حسابك الآن، وتُفتح أدوات النشر بعد تفعيل الباقة' }}</p>
      </div>
    </div>
    @if (!live) {
      <a class="subscription-note dashboard-subscription" routerLink="/p/package">
        <b>حسابك غير مشترك حاليًا</b>
        <span>اختاري باقة لتتمكني من إضافة الخدمات والألبومات والظهور للعميلات.</span>
      </a>
    } @else if (packageName) {
      <div class="active-package">
        <div>
          <span class="status success">الباقة مفعّلة</span>
          <h3>{{ packageTitle }}</h3>
          <p>يمكنكِ استخدام الخدمات والألبومات وجميع أدوات الحساب{{ endLabel }}.</p>
        </div>
        <a class="btn secondary" routerLink="/p/package">إدارة الاشتراك</a>
      </div>
    }
    <div class="grid cols-4">
      @for (metric of metrics; track metric.label) {
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
    <br />
    @if (live) {
      <div class="grid wide-side">
        <div class="card">
          <h3>المشاهدات آخر 7 أيام</h3>
          @if (chartBars.length) {
            <div class="chart-summary">
              <span><b>{{ chartTotal }}</b> إجمالي المشاهدات</span>
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
            <p class="muted small">ستظهر المشاهدات بعد زيارة العميلات لملفك.</p>
          }
        </div>
        <div class="card">
          <span class="status success">الحساب نشط</span>
          <h3 style="margin-top:14px">ملفك ظاهر للعميلات</h3>
          <p class="small muted">يمكنكِ إدارة الخدمات والألبومات ومتابعة الأداء من القائمة.</p>
          <a class="btn primary" routerLink="/p/services">إدارة الخدمات</a>
        </div>
      </div>
    } @else {
      <div class="card empty">
        <div class="symbol">◇</div>
        <h3>ابدئي باختيار باقتك</h3>
        <p class="small muted">يمكنكِ دخول الرئيسية وإدارة بياناتك، لكن إضافة الخدمات والأعمال تتطلب باقة مفعّلة.</p>
        <a class="btn primary" routerLink="/p/package">عرض الباقات والاشتراك</a>
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
    this.shell.set('لوحة التحكم');
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
    return name.includes('باقة') ? name : `الباقة ${name}`;
  }

  get endLabel(): string {
    const end = this.data?.subscription?.endAt;
    if (!end) {
      return '';
    }
    const date = new Date(end);
    if (Number.isNaN(date.getTime())) {
      return ` حتى ${end.slice(0, 10)}`;
    }
    return ` حتى ${new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)}`;
  }

  get metrics() {
    const stats = this.data?.stats;
    if (!this.live) {
      return [
        { label: 'مشاهدات الملف', value: '0', trend: 'بعد تفعيل الباقة' },
        { label: 'مرات التواصل', value: '0', trend: 'بعد تفعيل الباقة' },
        { label: 'العميلات', value: '—', trend: 'إجمالي الحسابات المسجلة' },
        { label: 'التقييم', value: '—', trend: 'لا توجد تقييمات' },
      ];
    }
    const rating = stats?.ratingAvg;
    return [
      { label: 'مشاهدات الملف', value: this.formatCount(stats?.views30d ?? 0), trend: '' },
      { label: 'مرات التواصل', value: '0', trend: '' },
      { label: 'العميلات', value: '—', trend: 'إجمالي الحسابات المسجلة' },
      {
        label: 'التقييم',
        value: rating != null ? String(rating) : '—',
        trend: '',
        stars: rating != null ? '★★★★★' : '',
      },
    ];
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
