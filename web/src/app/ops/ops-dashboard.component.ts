import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsDashboard, OpsInboxItem } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { SessionService } from '../core/session.service';
import { IconComponent } from '../shared/icon.component';
import { opsDate } from './ops-ui';

@Component({
  selector: 'app-ops-dashboard',
  imports: [RouterLink, IconComponent],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>لوحة المعلومات</h2>
        <p>ملخص المنصة والمهام المخصصة لحسابك.</p>
      </div>
    </div>
    <div class="stats stats-6">
      <a class="stat" routerLink="/ops/clients" [queryParams]="{ type: 'CUSTOMER' }">
        <div class="top"><span>عدد العميلات</span><span class="head-icon"><app-icon name="profile" /></span></div>
        <b>{{ dash?.customers ?? '—' }}</b>
        <span>حساب عميلة مسجّل</span>
      </a>
      <a class="stat" routerLink="/ops/clients" [queryParams]="{ type: 'PROVIDER' }">
        <div class="top"><span>الخبيرات</span><span class="head-icon"><app-icon name="expert" /></span></div>
        <b>{{ dash?.activeProviders ?? '—' }}</b>
        <span>حساب خبيرة نشط</span>
      </a>
      <article class="stat">
        <div class="top"><span>الحسابات النشطة</span><span class="head-icon"><app-icon name="home" /></span></div>
        <b>{{ dash?.activeAccounts ?? '—' }}</b>
        <span>عميلات وخبيرات</span>
      </article>
      <a class="stat" routerLink="/ops/staff">
        <div class="top"><span>موظفو التشغيل</span><span class="head-icon"><app-icon name="profile" /></span></div>
        <b>{{ dash?.staffCount ?? '—' }}</b>
        <span>حسابات تشغيل ومالية</span>
      </a>
      <a class="stat" routerLink="/ops/tickets" [queryParams]="{ priority: '1' }">
        <div class="top"><span>طلبات مصعّدة</span><span class="head-icon"><app-icon name="support" /></span></div>
        <b>{{ dash?.escalatedTickets ?? 0 }}</b>
        <span>تحتاج مراجعة إدارية</span>
      </a>
      <a class="stat" routerLink="/ops/events">
        <div class="top"><span>أحداث اليوم</span><span class="head-icon"><app-icon name="views" /></span></div>
        <b>{{ dash?.eventsToday ?? 0 }}</b>
        <span>مسجّلة في السجل</span>
      </a>
    </div>

    <div class="section-head">
      <div>
        <h2>مهام تحتاج إجراء</h2>
        <p>الأحدث أولًا. اضغطي الصف للانتقال إلى شاشة المراجعة.</p>
      </div>
    </div>

    @if (loading) {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr><th>النوع</th><th>التفاصيل</th><th>التاريخ</th></tr>
          </thead>
          <tbody>
            @for (row of skeleton; track row) {
              <tr>
                <td><div class="ops-skeleton" style="width:72px"></div></td>
                <td><div class="ops-skeleton" style="width:220px"></div></td>
                <td><div class="ops-skeleton" style="width:110px"></div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!inbox.length) {
      <p class="page-empty">لا توجد مهام معلّقة الآن.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>النوع</th>
              <th>التفاصيل</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            @for (item of inbox; track item.kind + item.id) {
              <tr [routerLink]="inboxRoute(item)" [queryParams]="inboxQuery(item)">
                <td><span class="ops-inbox-kind">{{ kindLabel(item.kind) }}</span></td>
                <td>
                  <b>{{ item.title }}</b>
                  <div class="muted small">{{ item.subtitle }}</div>
                </td>
                <td>{{ opsDate(item.createdAt) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="grid two" style="margin-top:22px">
      <article class="card">
        <h3>حالة العمل اليوم</h3>
        <a class="activity" routerLink="/ops/media">
          <span class="dot"></span>
          <div><b>ملفات بانتظار الاعتماد</b><span>{{ dash?.pendingMedia ?? 0 }} عنصر</span></div>
        </a>
        <a class="activity" routerLink="/ops/media">
          <span class="dot"></span>
          <div><b>إيصالات تحويل</b><span>{{ dash?.pendingReceipts ?? 0 }} إيصال</span></div>
        </a>
        <a class="activity" routerLink="/ops/accounts">
          <span class="dot"></span>
          <div><b>حسابات خبيرات للمراجعة</b><span>{{ dash?.pendingProviders ?? 0 }} حساب</span></div>
        </a>
        <a class="activity" routerLink="/ops/reviews" [queryParams]="{ tab: 'ratings' }">
          <span class="dot"></span>
          <div><b>تقييمات وبلاغات</b><span>{{ (dash?.pendingRatings ?? 0) + (dash?.openComplaints ?? 0) }} عنصر</span></div>
        </a>
        <a class="activity" routerLink="/ops/packages">
          <span class="dot"></span>
          <div><b>اشتراكات تنتهي خلال 7 أيام</b><span>{{ dash?.expiringSubscriptions ?? 0 }} باقة</span></div>
        </a>
      </article>
      <article class="card">
        <h3>اختصارات الإدارة</h3>
        <div class="ops-shortcuts">
          <a class="btn ghost" routerLink="/ops/catalog">الخدمات</a>
          <a class="btn ghost" routerLink="/ops/geo">المناطق</a>
          <a class="btn ghost" routerLink="/ops/packages">الباقات</a>
          @if (session.user()?.permissions?.includes('SETTINGS_MANAGE')) {
            <a class="btn ghost" routerLink="/ops/settings">الإعدادات</a>
          }
          @if (session.hasAnyPermission('BROADCAST_ALL', 'BROADCAST_PROVIDER', 'BROADCAST_CUSTOMER', 'NOTIFY_PROVIDER', 'NOTIFY_CUSTOMER')) {
            <a class="btn ghost" routerLink="/ops/notices">إشعارات المنصة</a>
          }
          @if (session.hasAnyPermission('CUSTOMERS_REVIEW', 'PROVIDERS_APPROVE')) {
            <a class="btn ghost" routerLink="/ops/clients">عملاء المنصة</a>
          }
          @if (session.user()?.permissions?.includes('USERS_MANAGE')) {
            <a class="btn ghost" routerLink="/ops/staff">الموظفات</a>
          }
          @if (session.user()?.permissions?.includes('LEGAL_MANAGE')) {
            <a class="btn ghost" routerLink="/ops/legal">الشروط</a>
          }
          @if (session.user()?.permissions?.includes('REPORTS_VIEW')) {
            <a class="btn ghost" routerLink="/ops/activity">نشاط الفريق</a>
          }
        </div>
        <p class="notice" style="margin-top:16px">
          أي صورة أو فيديو أو إيصال لا يظهر للعامة إلا بعد الاعتماد من شاشة الملفات.
        </p>
      </article>
    </div>
  `,
})
export class OpsDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  readonly session = inject(SessionService);
  readonly opsDate = opsDate;
  readonly skeleton = [1, 2, 3, 4, 5];

  dash: OpsDashboard | null = null;
  loading = true;

  get inbox(): OpsInboxItem[] {
    return this.dash?.inbox ?? [];
  }

  ngOnInit(): void {
    this.shell.set('لوحة  المعلومات', 'مهام الاعتماد والمراجعة');
    this.api.opsDashboard().subscribe({
      next: (dash) => {
        this.dash = dash;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل اللوحة'));
      },
    });
  }

  kindLabel(kind: string): string {
    const labels: Record<string, string> = {
      MEDIA: 'ملف',
      RECEIPT: 'إيصال',
      PROVIDER: 'حساب خبيرة',
      CHANGE: 'تعديل ملف',
      RATING: 'تقييم',
      COMPLAINT: 'بلاغ',
      TICKET: 'طلب دعم',
    };
    return labels[kind] ?? kind;
  }

  inboxRoute(item: OpsInboxItem): string {
    if (item.kind === 'PROVIDER') {
      return '/ops/accounts';
    }
    if (item.kind === 'TICKET') {
      return '/ops/tickets';
    }
    if (item.kind === 'CHANGE' || item.kind === 'RATING' || item.kind === 'COMPLAINT') {
      return '/ops/reviews';
    }
    return '/ops/media';
  }

  inboxQuery(item: OpsInboxItem): Record<string, string> {
    if (item.kind === 'CHANGE') {
      return { tab: 'changes' };
    }
    if (item.kind === 'RATING') {
      return { tab: 'ratings' };
    }
    if (item.kind === 'COMPLAINT') {
      return { tab: 'complaints' };
    }
    return {};
  }
}
