import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { ProviderTicket, TicketType } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-support',
  imports: [FormsModule],
  template: `
    <form class="card form-card" (ngSubmit)="send()">
      <div class="form-grid">
        <div class="field full">
          <label>نوع الطلب</label>
          <select class="input" name="typeCode" [(ngModel)]="typeCode">
            <option value="">اختاري النوع</option>
            @for (type of types; track type.id) {
              <option [value]="type.code">{{ locale.localizedName(type) }}</option>
            }
          </select>
        </div>
        <div class="field full">
          <label>التفاصيل</label>
          <textarea class="input" name="body" [(ngModel)]="body" placeholder="اكتبي تفاصيل الطلب"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:18px" type="submit" [disabled]="loading">إرسال للتذكرة</button>
    </form>
    @if (tickets.length === 0) {
      <p class="page-empty">لا توجد تذاكر بعد.</p>
    } @else {
      <div class="grid two" style="margin-top:18px">
        @for (ticket of tickets; track ticket.id) {
          <article class="card">
            <h3 style="color:var(--plum);margin:0">{{ ticket.refNo }}</h3>
            <p style="color:var(--muted);font-size:11px">{{ locale.localizedName(ticket.type) }} · {{ ticket.status }}</p>
            <p style="font-size:11px;line-height:1.8">{{ ticket.body }}</p>
          </article>
        }
      </div>
    }
  `,
})
export class ProviderSupportComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);
  types: TicketType[] = [];
  tickets: ProviderTicket[] = [];
  typeCode = '';
  body = '';
  loading = false;

  ngOnInit(): void {
    this.shell.set('الدعم والصيانة', 'التذاكر والمساعدة');
    this.api.ticketTypes().subscribe({ next: (types) => (this.types = types) });
    this.reload();
  }

  send(): void {
    if (!this.typeCode || this.body.trim().length < 8) {
      this.toast.show('اختاري النوع واكتبي تفاصيل أوضح');
      return;
    }
    this.loading = true;
    this.api.createProviderTicket({ typeCode: this.typeCode, body: this.body.trim() }).subscribe({
      next: () => {
        this.loading = false;
        this.body = '';
        this.toast.show('تم إرسال التذكرة');
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر إرسال التذكرة'));
      },
    });
  }

  private reload(): void {
    this.api.providerTickets().subscribe({ next: (tickets) => (this.tickets = tickets) });
  }
}
