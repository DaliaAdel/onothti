import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsTicket } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { clip, keepSelected, newestFirst, opsDate, statusTone } from './ops-ui';

@Component({
  selector: 'app-ops-tickets',
  imports: [FormsModule, OpsDrawerComponent],
  template: `
    <div class="filters">
      <button class="chip" type="button" [class.active]="status === ''" (click)="setStatus('')">الكل</button>
      <button class="chip" type="button" [class.active]="status === 'SENT'" (click)="setStatus('SENT')">جديدة</button>
      <button class="chip" type="button" [class.active]="status === 'IN_PROGRESS'" (click)="setStatus('IN_PROGRESS')">قيد المعالجة</button>
      <button class="chip" type="button" [class.active]="status === 'RESOLVED'" (click)="setStatus('RESOLVED')">محلولة</button>
      <button class="chip" type="button" [class.active]="status === 'CLOSED'" (click)="setStatus('CLOSED')">مغلقة</button>
    </div>

    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!items.length) {
      <p class="page-empty">لا توجد طلبات في هذا التبويب.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>النوع</th>
              <th>المرسلة</th>
              <th>الملخص</th>
              <th>الحالة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items; track item.id) {
              <tr [class.active]="selected?.id === item.id" (click)="selected = item">
                <td><b>{{ item.refNo }}</b></td>
                <td>{{ item.type.nameAr }}</td>
                <td>{{ item.owner.displayName }}</td>
                <td class="clip">{{ clip(item.body) }}</td>
                <td><span class="status {{ statusTone(item.status) }}">{{ statusAr(item.status) }}</span></td>
                <td>{{ opsDate(item.createdAt) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <app-ops-drawer
      [open]="!!selected"
      [title]="selected?.refNo || ''"
      [kicker]="selected?.type?.nameAr || 'طلب دعم'"
      (closed)="selected = null"
    >
      @if (selected; as item) {
        <p class="muted small">
          {{ item.owner.displayName }} · {{ item.owner.accountCode }} ·
          <span dir="ltr">{{ item.owner.mobile }}</span>
        </p>
        <p class="muted small">{{ opsDate(item.createdAt) }} · {{ statusAr(item.status) }}</p>
        <p style="margin:14px 0;white-space:pre-wrap;line-height:1.8">{{ item.body }}</p>
        @if (item.comments.length) {
          <h4 style="margin:18px 0 8px;color:var(--plum)">الردود</h4>
          @for (comment of item.comments; track comment.id) {
            <p class="muted small" style="margin:0 0 8px">
              <b>{{ comment.author.displayName }}:</b> {{ comment.body }}
              <span> · {{ opsDate(comment.createdAt) }}</span>
            </p>
          }
        }
        <textarea class="input" rows="3" placeholder="رد للخبيرة" [(ngModel)]="replies[item.id]"></textarea>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="reply(item)">إرسال الرد</button>
          @if (item.status !== 'IN_PROGRESS') {
            <button class="btn ghost" type="button" (click)="setTicketStatus(item, 'IN_PROGRESS')">معالجة</button>
          }
          @if (item.status !== 'RESOLVED') {
            <button class="btn ghost" type="button" (click)="setTicketStatus(item, 'RESOLVED')">تم الحل</button>
          }
          @if (item.status !== 'CLOSED') {
            <button class="btn ghost" type="button" (click)="setTicketStatus(item, 'CLOSED')">إغلاق</button>
          }
        </div>
      }
    </app-ops-drawer>
  `,
})
export class OpsTicketsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;
  readonly clip = clip;

  loading = true;
  status = 'SENT';
  items: OpsTicket[] = [];
  selected: OpsTicket | null = null;
  replies: Record<string, string> = {};

  ngOnInit(): void {
    this.shell.set('طلبات الدعم', 'الرد على تذاكر الخبيرات وإغلاقها');
    this.load();
  }

  setStatus(status: string): void {
    this.status = status;
    this.selected = null;
    this.load();
  }

  statusAr(status: string): string {
    const labels: Record<string, string> = {
      SENT: 'جديدة',
      IN_PROGRESS: 'قيد المعالجة',
      RESOLVED: 'محلولة',
      CLOSED: 'مغلقة',
    };
    return labels[status] ?? status;
  }

  reply(item: OpsTicket): void {
    const body = this.replies[item.id]?.trim();
    if (!body || body.length < 2) {
      this.toast.show('أدخلي نص الرد');
      return;
    }
    this.api.opsCommentTicket(item.id, body).subscribe({
      next: (row) => {
        this.replace(row);
        this.replies[item.id] = '';
        this.toast.show('تم إرسال الرد');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الرد')),
    });
  }

  setTicketStatus(item: OpsTicket, status: 'SENT' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'): void {
    this.api.opsPatchTicket(item.id, status).subscribe({
      next: (row) => {
        this.replace(row);
        this.toast.show('تم تحديث حالة الطلب');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث الطلب')),
    });
  }

  private replace(row: OpsTicket): void {
    this.items = this.items.map((item) => (item.id === row.id ? row : item));
    if (this.status && row.status !== this.status) {
      this.items = this.items.filter((item) => item.id !== row.id);
      this.selected = null;
      return;
    }
    this.selected = keepSelected(this.items, row);
  }

  private load(): void {
    this.loading = true;
    this.api.opsTickets(this.status || undefined).subscribe({
      next: (items) => {
        this.items = newestFirst(items);
        this.selected = keepSelected(this.items, this.selected);
        for (const item of items) {
          this.replies[item.id] ??= '';
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الطلبات'));
      },
    });
  }
}
