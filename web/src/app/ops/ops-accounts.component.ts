import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsManagedAccount, OpsPendingProvider } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsAccountFileComponent } from './ops-account-file.component';
import { newestFirst, opsDate, statusTone } from './ops-ui';

@Component({
  selector: 'app-ops-accounts',
  imports: [OpsAccountFileComponent],
  template: `
    @if (!selected) {
      <div class="section-head">
        <div>
          <h2>اعتماد حسابات الخبيرات</h2>
          <p>اضغطي على صف لعرض ملف الخبيرة ثم اعتمدي أو أوقفي الحساب.</p>
        </div>
      </div>

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
                <tr (click)="openFile(item)">
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
    } @else {
      <div class="section-head">
        <div>
          <button class="text-link" type="button" (click)="closeFile()">→ رجوع للاعتماد</button>
          <h2>{{ selected.displayName }}</h2>
          <p>ملف الخبيرة للعرض فقط</p>
        </div>
      </div>
      @if (detailLoading) {
        <p class="loading">جاري تحميل الملف...</p>
      }
      <app-ops-account-file [account]="selected" />
      <div class="ops-drawer-actions">
        <button class="btn primary" type="button" (click)="review(true)">اعتماد الملف</button>
        <button class="btn ghost" type="button" (click)="review(false)">إيقاف</button>
      </div>
    }
  `,
})
export class OpsAccountsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;

  pending: OpsPendingProvider[] = [];
  selected: OpsManagedAccount | null = null;
  loading = true;
  detailLoading = false;

  ngOnInit(): void {
    this.shell.set('اعتماد الحسابات', 'مراجعة ملفات الخبيرات بانتظار الاعتماد');
    this.loadPending();
  }

  openFile(item: OpsPendingProvider): void {
    this.detailLoading = true;
    this.api.opsAccount(item.id).subscribe({
      next: (row) => {
        this.selected = row;
        this.shell.set(row.displayName, 'ملف الخبيرة');
        this.detailLoading = false;
      },
      error: (err) => {
        this.detailLoading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الملف'));
      },
    });
  }

  closeFile(): void {
    this.selected = null;
    this.shell.set('اعتماد الحسابات', 'مراجعة ملفات الخبيرات بانتظار الاعتماد');
  }

  review(approve: boolean): void {
    if (!this.selected) {
      return;
    }
    this.api.opsReviewProvider(this.selected.id, approve).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد الحساب' : 'تم إيقاف الحساب');
        this.selected = null;
        this.shell.set('اعتماد الحسابات', 'مراجعة ملفات الخبيرات بانتظار الاعتماد');
        this.loadPending();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تنفيذ القرار')),
    });
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
        if (this.selected && !this.pending.some((row) => row.id === this.selected?.id)) {
          this.selected = null;
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الحسابات'));
      },
    });
  }
}
