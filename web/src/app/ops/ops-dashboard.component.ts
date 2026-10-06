import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsDashboard } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-ops-dashboard',
  imports: [RouterLink],
  template: `
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
          <span>حسابات خبيرات لل مراجعة</span>
          <strong>{{ dash?.pendingProviders ?? '—' }}</strong>
        </div>
      </a>
      <a class="card metric hover" routerLink="/ops/packages">
        <div>
          <span>الباقات والحملات</span>
          <strong>إدارة</strong>
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
      <a class="card metric hover" routerLink="/ops/tickets">
        <div>
          <span>طلبات دعم مفتوحة</span>
          <strong>{{ dash?.openTickets ?? 0 }}</strong>
        </div>
      </a>
    </div>
    <div class="grid four" style="margin-top:17px">
      <article class="card metric">
        <div>
          <span>اشتراكات تنتهي خلال 7 أيام</span>
          <strong>{{ dash?.expiringSubscriptions ?? 0 }}</strong>
        </div>
      </article>
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
      @if (session.user()?.permissions?.includes('SETTINGS_MANAGE')) {
        <a class="card metric hover" routerLink="/ops/settings">
          <div>
            <span>الإعدادات والرسائل</span>
            <strong>إدارة</strong>
          </div>
        </a>
      }
    </div>
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
  dash: OpsDashboard | null = null;

  ngOnInit(): void {
    this.shell.set('لوحة التشغيل', 'مؤشرات الاعتماد والمراجعة');
    this.api.opsDashboard().subscribe({
      next: (dash) => (this.dash = dash),
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحميل اللوحة')),
    });
  }
}
