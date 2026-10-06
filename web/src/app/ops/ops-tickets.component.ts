import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsTicket } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-ops-tickets',
  imports: [FormsModule, DatePipe],
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
      <div class="grid two">
        @for (item of items; track item.id) {
          <article class="card">
            <p style="margin:0 0 6px;font-weight:700;color:var(--plum)">
              {{ item.type.nameAr }} · {{ item.refNo }}
            </p>
            <p class="muted small">
              {{ item.owner.displayName }} · {{ item.owner.accountCode }} · {{ item.owner.mobile }} ·
              {{ item.createdAt | date: 'dd/MM/yyyy HH:mm' }}
            </p>
            <p style="margin:10px 0;white-space:pre-wrap">{{ item.body }}</p>
            @if (item.comments.length) {
              <div style="border-top:1px solid var(--line);padding-top:10px;margin-top:10px">
                @for (comment of item.comments; track comment.id) {
                  <p class="muted small" style="margin:0 0 8px">
                    <b>{{ comment.author.displayName }}:</b> {{ comment.body }}
                  </p>
                }
              </div>
            }
            <textarea class="input" rows="2" placeholder="رد للخبيرة" [(ngModel)]="replies[item.id]"></textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
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
          </article>
        }
      </div>
    }
  `,
})
export class OpsTicketsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  loading = true;
  status = 'SENT';
  items: OpsTicket[] = [];
  replies: Record<string, string> = {};

  ngOnInit(): void {
    this.shell.set('طلبات الدعم', 'الرد على تذاكر الخبيرات وإغلاقها');
    this.load();
  }

  setStatus(status: string): void {
    this.status = status;
    this.load();
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
    }
  }

  private load(): void {
    this.loading = true;
    this.api.opsTickets(this.status || undefined).subscribe({
      next: (items) => {
        this.items = items;
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
