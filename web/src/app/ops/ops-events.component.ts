import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsAuditEvent } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { opsDate } from './ops-ui';

@Component({
  selector: 'app-ops-events',
  imports: [FormsModule],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>سجل أحداث المنصة</h2>
        <p>سجل غير قابل للتعديل لإجراءات التشغيل والإدارة.</p>
      </div>
      <button class="btn ghost" type="button" (click)="exportCsv()" [disabled]="!items.length">تصدير CSV</button>
    </div>
    <article class="card form-card" style="margin-bottom:18px">
      <div class="form-grid">
        <div class="field">
          <label>بحث</label>
          <input class="input" [(ngModel)]="q" placeholder="الإجراء أو المستخدمة أو رقم العنصر" (keyup.enter)="load()" />
        </div>
        <div class="field">
          <label>النوع</label>
          <select class="input" [(ngModel)]="action" (ngModelChange)="load()">
            <option value="">الكل</option>
            <option value="STAFF_CREATE">إنشاء موظفة</option>
            <option value="STAFF_UPDATE">تعديل موظفة</option>
            <option value="STAFF_PASSWORD_RESET">إعادة تعيين كلمة المرور</option>
            <option value="ACCOUNT_STATUS">حالة حساب</option>
            <option value="ACCOUNT_PACKAGE">باقة حساب</option>
            <option value="NOTIFY_ACCOUNT">إشعار فردي</option>
            <option value="TICKET_UPDATE">تحديث طلب</option>
            <option value="TICKET_ESCALATE">تصعيد طلب</option>
            <option value="TICKET_ROUTE">توجيه طلب</option>
            <option value="TICKET_CLAIM">إسناد طلب</option>
            <option value="MEDIA_APPROVE">اعتماد ملف</option>
            <option value="MEDIA_REJECT">رفض ملف</option>
            <option value="PROVIDER_APPROVE">اعتماد خبيرة</option>
            <option value="PROVIDER_REJECT">رفض خبيرة</option>
            <option value="PROFILE_UPDATE">تعديل الملف الشخصي</option>
          </select>
        </div>
        <div class="field">
          <label>من تاريخ</label>
          <input class="input" type="date" [(ngModel)]="from" />
        </div>
        <div class="field">
          <label>إلى تاريخ</label>
          <input class="input" type="date" [(ngModel)]="to" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:14px" type="button" (click)="load()">بحث</button>
    </article>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!items.length) {
      <p class="page-empty">لا توجد أحداث مطابقة.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المستخدمة</th>
              <th>الإجراء</th>
              <th>العنصر</th>
              <th>النتيجة</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items; track item.id) {
              <tr>
                <td>{{ opsDate(item.createdAt) }}</td>
                <td>
                  <b>{{ item.actor?.displayName || 'النظام' }}</b>
                  <div class="muted small">{{ item.actor?.accountCode || '—' }}</div>
                </td>
                <td>{{ actionLabel(item.action) }}</td>
                <td>{{ item.entity }}{{ item.entityId ? ' · ' + item.entityId.slice(0, 8) : '' }}</td>
                <td><span class="status success">ناجح</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class OpsEventsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  readonly opsDate = opsDate;

  loading = true;
  q = '';
  action = '';
  from = '';
  to = '';
  items: OpsAuditEvent[] = [];

  ngOnInit(): void {
    this.shell.set('سجل الأحداث', 'متابعة عمليات المنصة');
    this.load();
  }

  actionLabel(action: string): string {
    const labels: Record<string, string> = {
      STAFF_CREATE: 'إنشاء موظفة',
      STAFF_UPDATE: 'تعديل موظفة',
      STAFF_PASSWORD_RESET: 'إعادة تعيين كلمة المرور',
      ACCOUNT_STATUS: 'تغيير حالة حساب',
      ACCOUNT_PACKAGE: 'تغيير باقة خبيرة',
      NOTIFY_ACCOUNT: 'إشعار فردي',
      TICKET_UPDATE: 'تحديث طلب',
      TICKET_ESCALATE: 'تصعيد طلب',
      TICKET_ROUTE: 'توجيه طلب',
      TICKET_CLAIM: 'إسناد طلب',
      MEDIA_APPROVE: 'اعتماد ملف',
      MEDIA_REJECT: 'رفض ملف',
      PROVIDER_APPROVE: 'اعتماد خبيرة',
      PROVIDER_REJECT: 'رفض خبيرة',
      PROFILE_UPDATE: 'تعديل الملف الشخصي',
    };
    return labels[action] ?? action;
  }

  exportCsv(): void {
    const header = ['التاريخ', 'المستخدمة', 'الرمز', 'الإجراء', 'العنصر'];
    const lines = this.items.map((item) =>
      [
        item.createdAt,
        item.actor?.displayName || 'النظام',
        item.actor?.accountCode || '',
        this.actionLabel(item.action),
        `${item.entity} ${item.entityId || ''}`.trim(),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'onothiti-events.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  load(): void {
    this.loading = true;
    this.api.opsEvents({
      q: this.q.trim() || undefined,
      action: this.action || undefined,
      from: this.from || undefined,
      to: this.to || undefined,
    }).subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل السجل'));
      },
    });
  }
}
