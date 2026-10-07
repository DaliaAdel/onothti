import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsDashboard, OpsInboxItem } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { SessionService } from '../core/session.service';
import { opsDate } from './ops-ui';

@Component({
  selector: 'app-ops-dashboard',
  imports: [RouterLink],
  template: `
    <div class="section-head" style="margin-top:0">
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

    <div class="section-head">
      <div>
        <h2>ملخص سريع</h2>
        <p>اختصارات للشاشات حسب العدد الحالي</p>
      </div>
    </div>
    <div class="grid four">
      <a class="card metric hover" routerLink="/ops/media">
        <div>
          <span>ملفات بانتظار الاعتماد</span>
          <strong>{{ dash?.pendingMedia ?? '—' }}</strong>
        </div>
      </a>
      <a class="card metric hover" routerLink="/ops/media">
        <div>
          <span>إيصالات تحويل</span>
          <strong>{{ dash?.pendingReceipts ?? '—' }}</strong>
        </div>
      </a>
      <a class="card metric hover" routerLink="/ops/accounts">
        <div>
          <span>حسابات خبيرات للمراجعة</span>
          <strong>{{ dash?.pendingProviders ?? '—' }}</strong>
        </div>
      </a>
      <a class="card metric hover" routerLink="/ops/tickets">
        <div>
          <span>طلبات دعم مفتوحة</span>
          <strong>{{ dash?.openTickets ?? 0 }}</strong>
        </div>
      </a>
    </div>
    <div class="grid four" style="margin-top:17px">
      <a class="card metric hover" routerLink="/ops/reviews" [queryParams]="{ tab: 'changes' }">
        <div>
          <span>تعديلات ملف معلّقة</span>
          <strong>{{ dash?.pendingProfileChanges ?? 0 }}</strong>
        </div>
      </a>
      <a class="card metric hover" routerLink="/ops/reviews" [queryParams]="{ tab: 'ratings' }">
        <div>
          <span>تقييمات للمراجعة</span>
          <strong>{{ dash?.pendingRatings ?? 0 }}</strong>
        </div>
      </a>
      <a class="card metric hover" routerLink="/ops/reviews" [queryParams]="{ tab: 'complaints' }">
        <div>
          <span>بلاغات مفتوحة</span>
          <strong>{{ dash?.openComplaints ?? 0 }}</strong>
        </div>
      </a>
      <article class="card metric">
        <div>
          <span>اشتراكات تنتهي خلال 7 أيام</span>
          <strong>{{ dash?.expiringSubscriptions ?? 0 }}</strong>
        </div>
      </article>
    </div>
    <div class="grid four" style="margin-top:17px">
      <a class="card metric hover" routerLink="/ops/catalog">
        <div>
          <span>الخدمات</span>
          <strong>إدارة</strong>
        </div>
      </a>
      <a class="card metric hover" routerLink="/ops/geo">
        <div>
          <span>المناطق والمدن</span>
          <strong>إدارة</strong>
        </div>
      </a>
      <a class="card metric hover" routerLink="/ops/packages">
        <div>
          <span>الباقات والحملات</span>
          <strong>إدارة</strong>
        </div>
      </a>
      @if (session.user()?.permissions?.includes('SETTINGS_MANAGE')) {
        <a class="card metric hover" routerLink="/ops/settings">
          <div>
            <span>الإعدادات والرسائل</span>
            <strong>إدارة</strong>
          </div>
        </a>
      }
    </div>
    @if (session.user()?.permissions?.includes('USERS_MANAGE') || session.user()?.permissions?.includes('LEGAL_MANAGE')) {
      <div class="grid four" style="margin-top:17px">
        @if (session.user()?.permissions?.includes('USERS_MANAGE')) {
          <a class="card metric hover" routerLink="/ops/staff">
            <div>
              <span>مستخدمو التشغيل</span>
              <strong>صلاحيات</strong>
            </div>
          </a>
        }
        @if (session.user()?.permissions?.includes('LEGAL_MANAGE')) {
          <a class="card metric hover" routerLink="/ops/legal">
            <div>
              <span>الشروط والسياسات</span>
              <strong>تحرير</strong>
            </div>
          </a>
        }
      </div>
    }
    <p class="notice" style="margin-top:22px">
      أي صورة أو فيديو أو إيصال ترفعه العميلة أو الخبيرة لا يظهر للعامة إلا بعد اعتمادكِ من شاشة اعتماد الملفات.
    </p>
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
    this.shell.set('لوحة التشغيل', 'مهام الاعتماد والمراجعة');
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
