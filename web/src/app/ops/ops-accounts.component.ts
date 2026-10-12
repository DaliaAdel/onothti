import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { CatalogPackage, OpsManagedAccount, OpsPendingProvider } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { keepSelected, newestFirst, opsDate, statusTone } from './ops-ui';

type AccountTab = 'pending' | 'all';

@Component({
  selector: 'app-ops-accounts',
  imports: [FormsModule, OpsDrawerComponent, OpsModalComponent],
  template: `
    <div class="filters">
      <button class="chip" type="button" [class.active]="tab === 'pending'" (click)="setTab('pending')">
        خبيرات بانتظار الاعتماد
      </button>
      <button class="chip" type="button" [class.active]="tab === 'all'" (click)="setTab('all')">
        كل الحسابات
      </button>
    </div>

    @if (tab === 'pending') {
      <p class="notice" style="margin-bottom:18px">
        اعتماد الحساب يعني قبول ملف الخبيرة للتشغيل. الظهور العام يبقى مرتبطًا باعتماد الإيصال من شاشة الملفات.
      </p>
      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!pending.length) {
        <p class="page-empty">لا توجد حسابات بانتظار المراجعة.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الرمز</th>
                <th>الجوال</th>
                <th>المدينة</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              @for (item of pending; track item.id) {
                <tr [class.active]="selectedPending?.id === item.id" (click)="selectedPending = item">
                  <td><b>{{ item.displayName }}</b></td>
                  <td>{{ item.accountCode }}</td>
                  <td dir="ltr">{{ item.mobile }}</td>
                  <td>{{ item.city?.nameAr || '—' }}</td>
                  <td><span class="status {{ statusTone(item.status) }}">{{ statusAr(item.status) }}</span></td>
                  <td>{{ opsDate(item.createdAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <app-ops-drawer
        [open]="!!selectedPending"
        [title]="selectedPending?.displayName || ''"
        kicker="خبيرة بانتظار الاعتماد"
        (closed)="selectedPending = null"
      >
        @if (selectedPending; as item) {
          <p class="muted small">{{ item.accountCode }} · <span dir="ltr">{{ item.mobile }}</span></p>
          <p class="muted small">{{ item.city?.nameAr || 'بدون مدينة' }} · {{ statusAr(item.status) }}</p>
          @if (item.package) {
            <p class="muted small">الباقة: {{ item.package.nameAr }}</p>
          }
          <p class="muted small">تاريخ التسجيل: {{ opsDate(item.createdAt) }}</p>
          <div class="ops-drawer-actions">
            <button class="btn primary" type="button" (click)="review(item, true)">اعتماد الملف</button>
            <button class="btn ghost" type="button" (click)="review(item, false)">إيقاف</button>
          </div>
        }
      </app-ops-drawer>
    }

    @if (tab === 'all') {
      <article class="card form-card" style="margin-bottom:18px">
        <div class="form-grid">
          <div class="field">
            <label>بحث</label>
            <input class="input" [(ngModel)]="q" placeholder="الاسم أو الجوال أو الرمز" (keyup.enter)="search()" />
          </div>
          <div class="field">
            <label>النوع</label>
            <select class="input" [(ngModel)]="accountType">
              <option value="">الكل</option>
              <option value="CUSTOMER">عميلة</option>
              <option value="PROVIDER">خبيرة</option>
            </select>
          </div>
          <div class="field">
            <label>الحالة</label>
            <select class="input" [(ngModel)]="status">
              <option value="">غير المحذوف</option>
              <option value="ACTIVE">نشط</option>
              <option value="PENDING_APPROVAL">بانتظار الاعتماد</option>
              <option value="RESTRICTED">مقيّد</option>
              <option value="SUSPENDED">موقوف</option>
              <option value="CANCELLED">ملغى</option>
            </select>
          </div>
        </div>
        <button class="btn primary" style="margin-top:14px" type="button" (click)="search()">بحث</button>
      </article>
      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!accounts.length) {
        <p class="page-empty">لا توجد حسابات مطابقة.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>النوع</th>
                <th>الرمز</th>
                <th>الجوال</th>
                <th>المدينة</th>
                <th>الباقة</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              @for (item of accounts; track item.id) {
                <tr [class.active]="selectedAccount?.id === item.id" (click)="openAccount(item)">
                  <td><b>{{ item.displayName }}</b></td>
                  <td>{{ typeAr(item.accountType) }}</td>
                  <td>{{ item.accountCode }}</td>
                  <td dir="ltr">{{ item.mobile }}</td>
                  <td>{{ item.customerProfile?.city?.nameAr || item.providerProfile?.city?.nameAr || '—' }}</td>
                  <td>{{ item.package?.nameAr || '—' }}</td>
                  <td><span class="status {{ statusTone(item.status) }}">{{ statusAr(item.status) }}</span></td>
                  <td>{{ opsDate(item.createdAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <app-ops-drawer
        [open]="!!selectedAccount"
        [title]="selectedAccount?.displayName || ''"
        [kicker]="selectedAccount ? typeAr(selectedAccount.accountType) : ''"
        (closed)="selectedAccount = null"
      >
        @if (selectedAccount; as item) {
          <p class="muted small">{{ item.accountCode }} · <span dir="ltr">{{ item.mobile }}</span></p>
          <p class="muted small">
            {{ item.customerProfile?.city?.nameAr || item.providerProfile?.city?.nameAr || 'بدون مدينة' }}
          </p>
          <p class="muted small">تاريخ التسجيل: {{ opsDate(item.createdAt) }}</p>
          <div class="field">
            <label>الحالة</label>
            <select class="input" [(ngModel)]="nextStatus[item.id]">
              <option value="ACTIVE">نشط</option>
              <option value="RESTRICTED">مقيّد</option>
              <option value="SUSPENDED">موقوف</option>
              <option value="CANCELLED">ملغى</option>
              <option value="DELETED">حذف</option>
            </select>
          </div>
          @if (item.accountType === 'PROVIDER') {
            <div class="field">
              <label>باقة الخبيرة</label>
              <select class="input" [(ngModel)]="nextPackage[item.id]">
                <option value="">بدون تغيير</option>
                @for (pkg of packages; track pkg.id) {
                  <option [value]="pkg.id">{{ pkg.nameAr }}</option>
                }
              </select>
            </div>
            @if (item.package) {
              <p class="muted small">الحالية: {{ item.package.nameAr }}@if (item.subscriptionEndAt) { · حتى {{ opsDate(item.subscriptionEndAt) }} }</p>
            }
          }
          <div class="field">
            <label>سبب التعديل</label>
            <textarea class="input" rows="3" [(ngModel)]="reasons[item.id]" placeholder="السبب مطلوب ويُحفظ في سجل الأحداث"></textarea>
          </div>
          <div class="ops-drawer-actions">
            <button class="btn primary" type="button" (click)="applyAccount(item)">حفظ الإجراء</button>
            @if (canNotify(item)) {
              <button class="btn ghost" type="button" (click)="openNotify(item)">إرسال إشعار</button>
            }
          </div>
        }
      </app-ops-drawer>
      <app-ops-modal
        [open]="!!notifyTarget"
        title="إشعار فردي"
        [kicker]="notifyTarget ? notifyTarget.displayName : ''"
        (closed)="notifyTarget = null"
      >
        @if (notifyTarget) {
          <p class="muted small">{{ notifyTarget.accountCode }} · <span dir="ltr">{{ notifyTarget.mobile }}</span></p>
        }
        <div class="field">
          <label>العنوان</label>
          <input class="input" [(ngModel)]="notifyDraft.titleAr" />
        </div>
        <div class="field">
          <label>النص</label>
          <textarea class="input" rows="3" [(ngModel)]="notifyDraft.bodyAr"></textarea>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="sendNotify()">إرسال الإشعار</button>
      </app-ops-modal>
    }
  `,
})
export class OpsAccountsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;

  tab: AccountTab = 'pending';
  pending: OpsPendingProvider[] = [];
  accounts: OpsManagedAccount[] = [];
  selectedPending: OpsPendingProvider | null = null;
  selectedAccount: OpsManagedAccount | null = null;
  loading = true;
  q = '';
  accountType = '';
  status = '';
  packages: CatalogPackage[] = [];
  nextStatus: Record<string, string> = {};
  nextPackage: Record<string, string> = {};
  reasons: Record<string, string> = {};
  notifyTarget: OpsManagedAccount | null = null;
  notifyDraft = { titleAr: '', bodyAr: '' };

  ngOnInit(): void {
    this.shell.set('حسابات العميلات والخبيرات', 'اعتماد الخبيرات وإدارة الحالة والباقة');
    this.api.packages().subscribe({
      next: (rows) => (this.packages = rows),
      error: () => undefined,
    });
    if (this.route.snapshot.queryParamMap.get('tab') === 'all') {
      this.setTab('all');
      return;
    }
    this.loadPending();
  }

  setTab(tab: AccountTab): void {
    this.tab = tab;
    this.selectedPending = null;
    this.selectedAccount = null;
    if (tab === 'pending') {
      this.loadPending();
    } else {
      this.search();
    }
  }

  openAccount(item: OpsManagedAccount): void {
    this.selectedAccount = item;
    this.nextStatus[item.id] ??= item.status === 'PENDING_APPROVAL' ? 'ACTIVE' : item.status;
    this.nextPackage[item.id] ??= item.package?.id ?? '';
    this.reasons[item.id] ??= '';
  }

  review(item: OpsPendingProvider, approve: boolean): void {
    this.api.opsReviewProvider(item.id, approve).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد الحساب' : 'تم إيقاف الحساب');
        this.selectedPending = null;
        this.loadPending();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تنفيذ القرار')),
    });
  }

  search(): void {
    this.loading = true;
    this.api
      .opsAccounts({
        q: this.q || undefined,
        accountType: this.accountType || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.accounts = newestFirst(rows);
          this.selectedAccount = keepSelected(this.accounts, this.selectedAccount);
          for (const row of rows) {
            this.nextStatus[row.id] ??= row.status === 'PENDING_APPROVAL' ? 'ACTIVE' : row.status;
            this.nextPackage[row.id] ??= row.package?.id ?? '';
            this.reasons[row.id] ??= '';
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر تحميل الحسابات'));
        },
      });
  }

  canNotify(item: OpsManagedAccount): boolean {
    if (item.accountType === 'PROVIDER') {
      return this.session.hasPermission('NOTIFY_PROVIDER');
    }
    if (item.accountType === 'CUSTOMER') {
      return this.session.hasPermission('NOTIFY_CUSTOMER');
    }
    return false;
  }

  openNotify(item: OpsManagedAccount): void {
    if (!this.canNotify(item)) {
      this.toast.show('ليست لديكِ صلاحية إشعار هذا الحساب');
      return;
    }
    this.notifyTarget = item;
    this.notifyDraft = { titleAr: '', bodyAr: '' };
  }

  sendNotify(): void {
    const item = this.notifyTarget;
    if (!item) {
      return;
    }
    if (this.notifyDraft.titleAr.trim().length < 2 || this.notifyDraft.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي عنوان الإشعار ونصه');
      return;
    }
    this.api.opsNotifyAccount(item.id, this.notifyDraft).subscribe({
      next: () => {
        this.toast.show(`تم إرسال الإشعار إلى ${item.displayName}`);
        this.notifyTarget = null;
        this.notifyDraft = { titleAr: '', bodyAr: '' };
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الإشعار')),
    });
  }

  applyAccount(item: OpsManagedAccount): void {
    const reason = (this.reasons[item.id] || '').trim();
    if (reason.length < 4) {
      this.toast.show('أدخلي سبب التعديل (4 أحرف على الأقل). يُحفظ في سجل الأحداث');
      return;
    }
    const status = this.nextStatus[item.id];
    const packageId = item.accountType === 'PROVIDER' ? this.nextPackage[item.id] || undefined : undefined;
    const statusChanged = Boolean(status && status !== item.status);
    const packageChanged = Boolean(packageId && packageId !== (item.package?.id || ''));
    if (!statusChanged && !packageChanged) {
      this.toast.show('لا يوجد تغيير للحفظ');
      return;
    }
    this.api
      .opsPatchAccount(item.id, {
        ...(statusChanged ? { status } : {}),
        ...(packageChanged ? { packageId } : {}),
        reason,
      })
      .subscribe({
        next: (row) => {
          item.status = row.status;
          item.package = row.package ?? item.package;
          item.subscriptionEndAt = row.subscriptionEndAt ?? item.subscriptionEndAt;
          this.nextPackage[item.id] = item.package?.id ?? '';
          this.toast.show('تم حفظ إجراء الحساب');
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث الحساب')),
      });
  }

  typeAr(type: string): string {
    return type === 'PROVIDER' ? 'خبيرة' : 'عميلة';
  }

  statusAr(status: string): string {
    const labels: Record<string, string> = {
      ACTIVE: 'نشط',
      INACTIVE: 'غير نشط',
      PENDING_APPROVAL: 'بانتظار الاعتماد',
      RESTRICTED: 'مقيّد',
      SUSPENDED: 'موقوف',
      CANCELLED: 'ملغى',
      DELETED: 'محذوف',
    };
    return labels[status] ?? status;
  }

  private loadPending(): void {
    this.loading = true;
    this.api.opsPendingProviders().subscribe({
      next: (items) => {
        this.pending = newestFirst(items);
        this.selectedPending = keepSelected(this.pending, this.selectedPending);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الحسابات'));
      },
    });
  }
}
