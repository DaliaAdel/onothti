import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-dashboard',
  imports: [RouterLink, IconComponent],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">حساب صانعة الجمال</span>
        <h2>أهلًا، {{ name }}</h2>
        <p>ملفك يظهر للباحثات وفق حالة الحساب والباقة. حافظي على تحديث خدماتك وأعمالك لتحسين الوصول.</p>
        <div class="hero-actions">
          <a class="btn primary" routerLink="/p/account">إدارة الملف <app-icon name="edit" /></a>
          <a class="btn ghost" routerLink="/p/package">تفاصيل الباقة</a>
        </div>
      </div>
      <img class="hero-art" src="/hero.png" alt="" />
    </section>
    <div class="section-head">
      <div>
        <h2>نظرة سريعة</h2>
        <p>أداء ملفك خلال آخر 30 يومًا</p>
      </div>
    </div>
    <div class="grid four">
      @for (metric of metrics; track metric.label) {
        <article class="card metric">
          <div>
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <span class="trend">{{ metric.trend }}</span>
          </div>
          <div class="metric-icon"><app-icon [name]="metric.icon" /></div>
        </article>
      }
    </div>
    <div class="section-head">
      <div>
        <h2>إدارة حضورك الاحترافي</h2>
        <p>خطوات بسيطة تحسن ظهورك</p>
      </div>
    </div>
    <div class="grid three">
      <article class="card hover">
        <div class="metric-icon"><app-icon name="user" /></div>
        <h3>الملف الاحترافي</h3>
        <p style="color:var(--muted);font-size:10px">حدّثي الاسم والمدينة ورقم واتساب</p>
        <a class="btn ghost" routerLink="/p/account">إدارة الملف</a>
      </article>
      <article class="card hover">
        <div class="metric-icon"><app-icon name="spark" /></div>
        <h3>خدماتي</h3>
        <p style="color:var(--muted);font-size:10px">أضيفي الخدمات الظاهرة للباحثات</p>
        <a class="btn ghost" routerLink="/p/services">إدارة الخدمات</a>
      </article>
      <article class="card hover">
        <div class="metric-icon"><app-icon name="image" /></div>
        <h3>ألبومات أعمالي</h3>
        <p style="color:var(--muted);font-size:10px">ارفعِ أعمالًا للمراجعة والاعتماد</p>
        <a class="btn ghost" routerLink="/p/portfolio">إدارة الأعمال</a>
      </article>
    </div>
  `,
})
export class ProviderDashboardComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);

  readonly metrics = [
    { icon: 'eye', label: 'مشاهدة للملف', value: '—', trend: 'ستظهر بعد التفعيل' },
    { icon: 'star', label: 'متوسط التقييم', value: '—', trend: 'بعد الاعتماد' },
    { icon: 'image', label: 'صورة معتمدة', value: '—', trend: 'ابدئي الألبوم' },
    { icon: 'spark', label: 'خدمات نشطة', value: '—', trend: 'أضيفي خدماتك' },
  ];

  get name(): string {
    return this.session.user()?.displayName || 'صانعة الجمال';
  }

  ngOnInit(): void {
    this.shell.set('لوحة صانعة الجمال', 'تابعي حسابك وأداء ملفك من مكان واحد');
  }
}
