import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { ProviderTicket, TicketType } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-customer-requests',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>طلباتي</h1>
        <p>ارفعي طلبًا جديدًا وتابعي الطلبات السابقة</p>
      </div>
    </div>
    @if (selected) {
      <button class="btn secondary" type="button" (click)="selected = null">← الرجوع إلى الطلبات</button>
      <div class="request-detail-head card">
        <div>
          <span class="request-type">{{ locale.localizedName(selected.type) }}</span>
          <h2>{{ titleOf(selected) }}</h2>
          <p class="muted small">{{ selected.refNo }} · {{ when(selected.createdAt) }}</p>
        </div>
        <span class="status" [class.warning]="!isDone(selected.status)" [class.success]="isDone(selected.status)">{{ statusLabel(selected.status) }}</span>
      </div>
      <div class="grid request-detail-layout">
        <div class="card">
          <h3>تفاصيل الطلب</h3>
          <p class="request-description">{{ selected.body }}</p>
        </div>
        <div class="card request-reply">
          <h3>رد المنصة</h3>
          @if (selected.comments?.length) {
            @for (comment of selected.comments; track comment.id) {
              <p class="muted small" style="margin:0 0 8px">
                <b>{{ comment.author.displayName }}:</b> {{ comment.body }}
              </p>
            }
          } @else {
            <p class="muted small">يتم الرد من فريق المنصة بعد المراجعة.</p>
          }
        </div>
      </div>
    } @else {
      <div class="card request-form">
        <h3>فتح طلب جديد</h3>
        <div class="grid cols-2">
          <div class="field">
            <label>نوع الطلب</label>
            <select name="typeCode" [(ngModel)]="typeCode">
              <option value="">اختاري النوع</option>
              @for (type of types; track type.id) {
                <option [value]="type.code">{{ locale.localizedName(type) }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>عنوان الطلب</label>
            <input name="title" [(ngModel)]="title" placeholder="اكتبي عنوانًا مختصرًا" />
          </div>
        </div>
        <div class="field">
          <label>تفاصيل الطلب</label>
          <textarea name="body" [(ngModel)]="body" placeholder="اكتبي تفاصيل الطلب هنا..."></textarea>
        </div>
        <button class="btn primary" type="button" [disabled]="loading" (click)="send()">إرسال الطلب</button>
      </div>
      <div class="section-title requests-history-title">
        <h3>الطلبات السابقة</h3>
        <div class="request-counts">
          <span><b>{{ tickets.length }}</b> الإجمالي</span>
          <span class="reviewed"><b>{{ reviewed }}</b> تمت المراجعة</span>
          <span class="processing"><b>{{ processing }}</b> قيد التنفيذ</span>
        </div>
      </div>
      <div class="card list">
        @for (ticket of tickets; track ticket.id) {
          <div class="list-row request-row">
            <span class="status" [class.warning]="!isDone(ticket.status)" [class.success]="isDone(ticket.status)">{{ statusLabel(ticket.status) }}</span>
            <div class="copy">
              <div class="request-title">
                <b>{{ titleOf(ticket) }}</b>
                <span class="request-type">{{ locale.localizedName(ticket.type) }}</span>
              </div>
              <p>{{ ticket.refNo }}</p>
            </div>
            <button class="btn ghost" type="button" (click)="selected = ticket">عرض</button>
          </div>
        }
        @if (!tickets.length) {
          <p class="muted small" style="margin:0">لا توجد طلبات بعد.</p>
        }
      </div>
    }
  `,
})
export class CustomerRequestsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);
  types: TicketType[] = [];
  tickets: ProviderTicket[] = [];
  selected: ProviderTicket | null = null;
  typeCode = '';
  title = '';
  body = '';
  loading = false;

  get reviewed(): number {
    return this.tickets.filter((ticket) => this.isDone(ticket.status)).length;
  }

  get processing(): number {
    return this.tickets.length - this.reviewed;
  }

  ngOnInit(): void {
    this.shell.set('طلباتي');
    this.api.customerTicketTypes().subscribe({ next: (types) => (this.types = types) });
    this.reload();
  }

  isDone(status: string): boolean {
    return ['CLOSED', 'RESOLVED', 'REVIEWED', 'DONE'].includes(status);
  }

  statusLabel(status: string): string {
    if (this.isDone(status)) {
      return 'تمت المراجعة';
    }
    if (status === 'SENT' || status === 'OPEN' || status === 'PENDING') {
      return 'قيد المراجعة';
    }
    return 'قيد التنفيذ';
  }

  titleOf(ticket: ProviderTicket): string {
    const first = ticket.body.split('\n')[0]?.trim();
    return first && first.length < 80 ? first : ticket.refNo;
  }

  when(value: string): string {
    return value.slice(0, 16).replace('T', ' ');
  }

  send(): void {
    if (!this.typeCode || this.body.trim().length < 8) {
      this.toast.show('اختاري النوع واكتبي تفاصيل أوضح');
      return;
    }
    const payload = this.title.trim() ? `${this.title.trim()}\n\n${this.body.trim()}` : this.body.trim();
    this.loading = true;
    this.api.createCustomerTicket({ typeCode: this.typeCode, body: payload }).subscribe({
      next: () => {
        this.loading = false;
        this.body = '';
        this.title = '';
        this.toast.show('تم إرسال الطلب');
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر إرسال التذكرة'));
      },
    });
  }

  private reload(): void {
    this.api.customerTickets().subscribe({ next: (tickets) => (this.tickets = tickets) });
  }
}
