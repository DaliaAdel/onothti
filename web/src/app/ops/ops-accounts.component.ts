import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsManagedAccount, OpsPendingProvider } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

type AccountTab = 'pending' | 'all';

@Component({
  selector: 'app-ops-accounts',
  imports: [FormsModule],
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
        <div class="grid two">
          @for (item of pending; track item.id) {
            <article class="card">
              <h3 style="margin:0 0 6px;color:var(--plum)">{{ item.displayName }}</h3>
              <p class="muted small">{{ item.accountCode }} · {{ item.mobile }} · {{ item.city?.nameAr || 'بدون مدينة' }}</p>
              <p class="muted small">{{ statusAr(item.status) }} @if (item.package) { · {{ item.package.nameAr }} }</p>
              <div style="display:flex;gap:8px;margin-top:14px">
                <button class="btn primary" type="button" (click)="review(item, true)">اعتماد الملف</button>
                <button class="btn ghost" type="button" (click)="review(item, false)">إيقاف</button>
              </div>
            </article>
          }
        </div>
      }
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
        <div class="grid two">
          @for (item of accounts; track item.id) {
            <article class="card">
              <h3 style="margin:0 0 6px;color:var(--plum)">{{ item.displayName }}</h3>
              <p class="muted small">
                {{ typeAr(item.accountType) }} · {{ item.accountCode }} · {{ item.mobile }}
              </p>
              <p class="muted small">
                {{ statusAr(item.status) }}
                · {{ item.customerProfile?.city?.nameAr || item.providerProfile?.city?.nameAr || 'بدون مدينة' }}
              </p>
              <div class="form-grid" style="margin-top:12px">
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
                <div class="field">
                  <label>سبب اختياري</label>
                  <input class="input" [(ngModel)]="reasons[item.id]" />
                </div>
              </div>
              <button class="btn primary" style="margin-top:12px" type="button" (click)="applyStatus(item)">تطبيق الحالة</button>
            </article>
          }
        </div>
      }
    }
  `,
})
export class OpsAccountsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  tab: AccountTab = 'pending';
  pending: OpsPendingProvider[] = [];
  accounts: OpsManagedAccount[] = [];
  loading = true;
  q = '';
  accountType = '';
  status = '';
  nextStatus: Record<string, string> = {};
  reasons: Record<string, string> = {};

  ngOnInit(): void {
    this.shell.set('الحسابات', 'اعتماد الخبيرات وإدارة حالات العميلة والخبيرة');
    this.loadPending();
  }

  setTab(tab: AccountTab): void {
    this.tab = tab;
    if (tab === 'pending') {
      this.loadPending();
    } else {
      this.search();
    }
  }

  review(item: OpsPendingProvider, approve: boolean): void {
    this.api.opsReviewProvider(item.id, approve).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد الحساب' : 'تم إيقاف الحساب');
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
          this.accounts = rows;
          for (const row of rows) {
            this.nextStatus[row.id] ??= row.status === 'PENDING_APPROVAL' ? 'ACTIVE' : row.status;
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

  applyStatus(item: OpsManagedAccount): void {
    const status = this.nextStatus[item.id];
    if (!status) {
      return;
    }
    this.api.opsPatchAccount(item.id, { status, reason: this.reasons[item.id] || undefined }).subscribe({
      next: (row) => {
        item.status = row.status;
        this.toast.show('تم تحديث حالة الحساب');
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
        this.pending = items;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الحسابات'));
      },
    });
  }
}
