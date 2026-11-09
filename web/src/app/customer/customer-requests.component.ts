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
        <h1>{{ locale.t('req.title') }}</h1>
        <p>{{ locale.t('req.sub') }}</p>
      </div>
    </div>
    @if (selected) {
      <button class="btn secondary back" type="button" (click)="selected = null">{{ locale.t('req.back') }}</button>
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
          <h3>{{ locale.t('req.details') }}</h3>
          <p class="request-description">{{ selected.body }}</p>
        </div>
        <div class="card request-reply">
          <h3>{{ locale.t('req.reply') }}</h3>
          @if (selected.comments?.length) {
            @for (comment of selected.comments; track comment.id) {
              <p class="muted small" style="margin:0 0 8px">
                <b>{{ comment.author.displayName }}:</b> {{ comment.body }}
              </p>
            }
          } @else {
            <p class="muted small">{{ locale.t('req.replyWait') }}</p>
          }
        </div>
      </div>
    } @else {
      <div class="card request-form">
        <h3>{{ locale.t('req.new') }}</h3>
        <div class="grid cols-2">
          <div class="field">
            <label>{{ locale.t('req.type') }}</label>
            <select name="typeCode" [(ngModel)]="typeCode">
              <option value="">{{ locale.t('req.pickType') }}</option>
              @for (type of types; track type.id) {
                <option [value]="type.code">{{ locale.localizedName(type) }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>{{ locale.t('req.issueTitle') }}</label>
            <input name="title" [(ngModel)]="title" [placeholder]="locale.t('req.issuePh')" />
          </div>
        </div>
        <div class="field">
          <label>{{ locale.t('req.body') }}</label>
          <textarea name="body" [(ngModel)]="body" [placeholder]="locale.t('req.bodyPh')"></textarea>
        </div>
        <button class="btn primary" type="button" [disabled]="loading" (click)="send()">{{ locale.t('req.send') }}</button>
      </div>
      <div class="section-title requests-history-title">
        <h3>{{ locale.t('req.history') }}</h3>
        <div class="request-counts">
          <span><b>{{ tickets.length }}</b> {{ locale.t('req.total') }}</span>
          <span class="reviewed"><b>{{ reviewed }}</b> {{ locale.t('req.reviewed') }}</span>
          <span class="processing"><b>{{ processing }}</b> {{ locale.t('req.processing') }}</span>
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
            <button class="btn ghost" type="button" (click)="selected = ticket">{{ locale.t('ui.view') }}</button>
          </div>
        }
        @if (!tickets.length) {
          <p class="muted small" style="margin:0">{{ locale.t('req.empty') }}</p>
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
    this.shell.set('c.requests.title');
    this.api.customerTicketTypes().subscribe({
      next: (types) => (this.types = types),
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('req.loadTypesFail'))),
    });
    this.reload();
  }

  isDone(status: string): boolean {
    return ['CLOSED', 'RESOLVED', 'REVIEWED', 'DONE'].includes(status);
  }

  statusLabel(status: string): string {
    if (this.isDone(status)) {
      return this.locale.t('req.status.reviewed');
    }
    if (status === 'SENT' || status === 'OPEN' || status === 'PENDING') {
      return this.locale.t('req.status.pending');
    }
    return this.locale.t('req.status.processing');
  }

  titleOf(ticket: ProviderTicket): string {
    const titled = ticket.title?.trim();
    if (titled) {
      return titled;
    }
    const first = ticket.body.split('\n')[0]?.trim();
    return first && first.length < 80 ? first : ticket.refNo;
  }

  when(value: string): string {
    return value.slice(0, 16).replace('T', ' ');
  }

  send(): void {
    if (!this.typeCode || this.title.trim().length < 2 || this.body.trim().length < 8) {
      this.toast.show(this.locale.t('req.fill'));
      return;
    }
    this.loading = true;
    this.api.createCustomerTicket({ typeCode: this.typeCode, title: this.title.trim(), body: this.body.trim() }).subscribe({
      next: () => {
        this.loading = false;
        this.body = '';
        this.title = '';
        this.toast.show(this.locale.t('req.sent'));
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('req.sendFail')));
      },
    });
  }

  private reload(): void {
    this.api.customerTickets().subscribe({ next: (tickets) => (this.tickets = tickets) });
  }
}
