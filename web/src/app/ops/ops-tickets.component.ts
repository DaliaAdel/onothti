import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsTicket, TicketType } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { SessionService } from '../core/session.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { clip, keepSelected, newestFirst, opsDate, statusTone, ticketTitle } from './ops-ui';

@Component({
  selector: 'app-ops-tickets',
  imports: [FormsModule, OpsDrawerComponent, OpsModalComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.ticket.heading') }}</h2>
        <p>{{ locale.t('ops.ticket.intro') }}</p>
      </div>
      @if (canReply) {
        <button class="btn primary" type="button" (click)="openAdd()">{{ locale.t('ops.ticket.add') }}</button>
      }
    </div>

    <div class="filters">
      <button class="chip" type="button" [class.active]="status === '' && !escalatedOnly" (click)="setStatus('')">{{ locale.t('ops.ui.all') }}</button>
      <button class="chip" type="button" [class.active]="status === 'SENT'" (click)="setStatus('SENT')">{{ locale.t('ops.ticket.status.SENT') }}</button>
      <button class="chip" type="button" [class.active]="status === 'IN_PROGRESS'" (click)="setStatus('IN_PROGRESS')">{{ locale.t('ops.ticket.status.IN_PROGRESS') }}</button>
      <button class="chip" type="button" [class.active]="status === 'RESOLVED'" (click)="setStatus('RESOLVED')">{{ locale.t('ops.ticket.status.RESOLVED') }}</button>
      <button class="chip" type="button" [class.active]="status === 'CLOSED'" (click)="setStatus('CLOSED')">{{ locale.t('ops.ticket.status.CLOSED') }}</button>
      <button class="chip" type="button" [class.active]="escalatedOnly" (click)="setEscalated()">{{ locale.t('ops.ticket.filter.escalated') }}</button>
      <button class="chip" type="button" [class.active]="mineOnly" (click)="setMine()">{{ locale.t('ops.ticket.filter.mine') }}</button>
      <button class="chip" type="button" [class.active]="queue === 'OPS'" (click)="setQueue('OPS')">{{ locale.t('ops.queue.ops') }}</button>
      <button class="chip" type="button" [class.active]="queue === 'FINANCE'" (click)="setQueue('FINANCE')">{{ locale.t('ops.queue.finance') }}</button>
      <button class="chip" type="button" [class.active]="queue === 'ADMIN'" (click)="setQueue('ADMIN')">{{ locale.t('ops.queue.admin') }}</button>
      <button class="chip" type="button" [class.active]="accountType === 'CUSTOMER'" (click)="setAccountType('CUSTOMER')">{{ locale.t('ops.type.customer') }}</button>
      <button class="chip" type="button" [class.active]="accountType === 'PROVIDER'" (click)="setAccountType('PROVIDER')">{{ locale.t('ops.type.provider') }}</button>
      <button class="chip" type="button" [class.active]="accountType === 'STAFF'" (click)="setAccountType('STAFF')">{{ locale.t('ops.type.staff') }}</button>
    </div>

    @if (loading) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else if (!items.length) {
      <p class="page-empty">{{ locale.t('ops.ticket.empty') }}</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>{{ locale.t('ops.ticket.col.ref') }}</th>
              <th>{{ locale.t('ops.ticket.col.type') }}</th>
              <th>{{ locale.t('ops.ticket.col.title') }}</th>
              <th>{{ locale.t('ops.ticket.col.sender') }}</th>
              <th>{{ locale.t('ops.ticket.col.accountType') }}</th>
              <th>{{ locale.t('ops.ticket.col.summary') }}</th>
              <th>{{ locale.t('ops.ui.status') }}</th>
              <th>{{ locale.t('ops.ticket.col.queue') }}</th>
              <th>{{ locale.t('ops.ticket.col.assignee') }}</th>
              <th>{{ locale.t('ops.ui.date') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items; track item.id) {
              <tr [class.active]="selected?.id === item.id" (click)="selected = item">
                <td><b>{{ item.refNo }}</b></td>
                <td><span class="request-type">{{ locale.localizedName(item.type) }}</span></td>
                <td>{{ ticketTitle(item) }}</td>
                <td>{{ item.owner.displayName }}</td>
                <td><span class="appr-role">{{ accountTypeLabel(item.owner.accountType) }}</span></td>
                <td class="clip">{{ clip(item.body) }}</td>
                <td><span class="status {{ statusTone(item.status) }}">{{ statusAr(item.status) }}</span></td>
                <td>{{ queueLabel(item.queue) }}</td>
                <td>{{ item.assignee?.displayName || '—' }}</td>
                <td>{{ opsDate(item.createdAt) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <app-ops-drawer
      [open]="!!selected"
      [title]="selected ? ticketTitle(selected) : ''"
      [kicker]="drawerKicker()"
      (closed)="selected = null"
    >
      @if (selected; as item) {
        <p class="muted small">{{ item.refNo }} · {{ locale.localizedName(item.type) }}</p>
        <p class="muted small">
          {{ item.owner.displayName }} · {{ accountTypeLabel(item.owner.accountType) }} · {{ item.owner.accountCode }} ·
          <span dir="ltr">{{ item.owner.mobile }}</span>
        </p>
        <p class="muted small">
          {{ opsDate(item.createdAt) }} · {{ statusAr(item.status) }} · {{ queueLabel(item.queue) }}
          @if (item.assignee) {
            · {{ locale.tf('ops.ticket.assignedTo', { name: item.assignee.displayName }) }}
          }
        </p>
        <p style="margin:14px 0;white-space:pre-wrap;line-height:1.8">{{ item.body }}</p>
        @if (item.comments.length) {
          <h4 style="margin:18px 0 8px;color:var(--plum)">{{ locale.t('ops.ticket.replies') }}</h4>
          @for (comment of item.comments; track comment.id) {
            <p class="muted small" style="margin:0 0 8px">
              <b>{{ comment.author.displayName }}:</b> {{ comment.body }}
              <span> · {{ opsDate(comment.createdAt) }}</span>
            </p>
          }
        }
        @if (canReply) {
          <textarea class="input" rows="3" [placeholder]="locale.t('ops.ticket.replyPh')" [(ngModel)]="replies[item.id]"></textarea>
        }
        <div class="ops-drawer-actions">
          @if (canReply) {
            <button class="btn primary" type="button" (click)="reply(item)">{{ locale.t('ops.ticket.sendReply') }}</button>
          }
          @if (canReply && item.status !== 'IN_PROGRESS') {
            <button class="btn ghost" type="button" (click)="setTicketStatus(item, 'IN_PROGRESS')">{{ locale.t('ops.ticket.process') }}</button>
          }
          @if (canClose && item.status !== 'RESOLVED') {
            <button class="btn ghost" type="button" (click)="setTicketStatus(item, 'RESOLVED')">{{ locale.t('ops.ticket.resolved') }}</button>
          }
          @if (canClose && item.status !== 'CLOSED') {
            <button class="btn ghost" type="button" (click)="setTicketStatus(item, 'CLOSED')">{{ locale.t('ops.ticket.close') }}</button>
          }
          @if (canReply && item.assignee?.id !== meId) {
            <button class="btn ghost" type="button" (click)="claim(item)">{{ locale.t('ops.ticket.claim') }}</button>
          }
          @if (canReply) {
            <button class="btn ghost" type="button" (click)="openRoute(item)">{{ locale.t('ops.ticket.route') }}</button>
          }
        </div>
      }
    </app-ops-drawer>
    <app-ops-modal
      [open]="!!routeTarget"
      [title]="locale.t('ops.ticket.route')"
      [kicker]="routeTarget?.refNo || ''"
      (closed)="routeTarget = null"
    >
      <div class="field">
        <label>{{ locale.t('ops.ticket.routeLabel') }}</label>
        <select class="input" [(ngModel)]="routeDraft.queue">
          <option value="OPS">{{ locale.t('ops.ticket.routeOps') }}</option>
          <option value="FINANCE">{{ locale.t('ops.ticket.routeFinance') }}</option>
          <option value="ADMIN">{{ locale.t('ops.ticket.routeAdmin') }}</option>
        </select>
      </div>
      <div class="field">
        <label>{{ locale.t('ops.ticket.adminNote') }}</label>
        <textarea class="input" rows="4" [(ngModel)]="routeDraft.note" [placeholder]="locale.t('ops.ticket.notePh')"></textarea>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="submitRoute()">{{ locale.t('ops.ticket.saveRoute') }}</button>
    </app-ops-modal>
    <app-ops-modal [open]="adding" [title]="locale.t('ops.ticket.addTitle')" [kicker]="locale.t('ops.ticket.addKicker')" (closed)="adding = false">
      <div class="field">
        <label>{{ locale.t('ops.ticket.typeReq') }}</label>
        <select class="input" [(ngModel)]="draft.typeCode">
          <option value="">{{ locale.t('ops.ticket.pickType') }}</option>
          @for (type of types; track type.id) {
            <option [value]="type.code">{{ locale.localizedName(type) }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label>{{ locale.t('ops.ticket.titleReq') }}</label>
        <input class="input" [(ngModel)]="draft.title" [placeholder]="locale.t('ops.ticket.titlePh')" />
      </div>
      <div class="field">
        <label>{{ locale.t('ops.ui.details') }}</label>
        <textarea class="input" rows="4" [(ngModel)]="draft.body" [placeholder]="locale.t('ops.ticket.detailsPh')"></textarea>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createTicket()">{{ locale.t('ops.ticket.addSubmit') }}</button>
    </app-ops-modal>
  `,
})
export class OpsTicketsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);
  readonly locale = inject(LocaleService);

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;
  readonly clip = clip;
  readonly ticketTitle = ticketTitle;
  readonly meId = this.session.user()?.id ?? '';

  get canReply(): boolean {
    return this.session.hasAnyPermission('TKT-01');
  }

  get canClose(): boolean {
    return this.session.hasAnyPermission('TKT-02');
  }

  loading = true;
  adding = false;
  status = 'SENT';
  escalatedOnly = false;
  mineOnly = false;
  queue = '';
  accountType = '';
  types: TicketType[] = [];
  items: OpsTicket[] = [];
  selected: OpsTicket | null = null;
  replies: Record<string, string> = {};
  routeTarget: OpsTicket | null = null;
  routeDraft = { queue: 'ADMIN' as 'OPS' | 'FINANCE' | 'ADMIN', note: '' };
  draft = { typeCode: '', title: '', body: '' };

  ngOnInit(): void {
    this.shell.set('ops.tickets.title', 'ops.tickets.sub');
    this.api.opsTicketTypes().subscribe({ next: (types) => (this.types = types) });
    if (this.route.snapshot.queryParamMap.get('priority') === '1') {
      this.escalatedOnly = true;
      this.status = '';
    }
    this.load();
  }

  setStatus(status: string): void {
    this.status = status;
    this.escalatedOnly = false;
    this.mineOnly = false;
    this.queue = '';
    this.selected = null;
    this.load();
  }

  setEscalated(): void {
    this.status = '';
    this.escalatedOnly = true;
    this.mineOnly = false;
    this.queue = '';
    this.selected = null;
    this.load();
  }

  setMine(): void {
    this.status = '';
    this.escalatedOnly = false;
    this.mineOnly = true;
    this.queue = '';
    this.selected = null;
    this.load();
  }

  setQueue(queue: string): void {
    this.status = '';
    this.escalatedOnly = false;
    this.mineOnly = false;
    this.queue = queue;
    this.selected = null;
    this.load();
  }

  setAccountType(accountType: string): void {
    this.accountType = this.accountType === accountType ? '' : accountType;
    this.selected = null;
    this.load();
  }

  drawerKicker(): string {
    if (!this.selected) {
      return this.locale.t('ops.ticket.kicker');
    }
    return `${this.locale.localizedName(this.selected.type)} · ${this.accountTypeLabel(this.selected.owner.accountType)}`;
  }

  accountTypeLabel(value?: string): string {
    if (value === 'PROVIDER') {
      return this.locale.t('ops.type.provider');
    }
    if (value === 'STAFF') {
      return this.locale.t('ops.type.staff');
    }
    if (value === 'CUSTOMER') {
      return this.locale.t('ops.type.customer');
    }
    return this.locale.t('ops.appr.type.account');
  }

  openAdd(): void {
    this.draft = { typeCode: this.types[0]?.code ?? '', title: '', body: '' };
    this.adding = true;
  }

  createTicket(): void {
    if (!this.draft.typeCode) {
      this.toast.show(this.locale.t('ops.ticket.needType'));
      return;
    }
    if (this.draft.title.trim().length < 2) {
      this.toast.show(this.locale.t('ops.ticket.needTitle'));
      return;
    }
    this.api
      .opsCreateTicket({
        typeCode: this.draft.typeCode,
        title: this.draft.title.trim(),
        body: this.draft.body.trim() || undefined,
      })
      .subscribe({
        next: (row) => {
          this.adding = false;
          this.status = 'SENT';
          this.escalatedOnly = false;
          this.mineOnly = false;
          this.queue = '';
          this.selected = row;
          this.replies[row.id] ??= '';
          this.toast.show(this.locale.t('ops.ticket.toast.added'));
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ticket.toast.addFail'))),
      });
  }

  queueLabel(queue?: string): string {
    if (queue === 'FINANCE') {
      return this.locale.t('ops.queue.finance');
    }
    if (queue === 'ADMIN') {
      return this.locale.t('ops.queue.admin');
    }
    return this.locale.t('ops.queue.ops');
  }

  statusAr(status: string): string {
    if (status === 'SENT') {
      return this.locale.t('ops.ticket.status.SENT');
    }
    if (status === 'IN_PROGRESS') {
      return this.locale.t('ops.ticket.status.IN_PROGRESS');
    }
    if (status === 'RESOLVED') {
      return this.locale.t('ops.ticket.status.RESOLVED');
    }
    if (status === 'CLOSED') {
      return this.locale.t('ops.ticket.status.CLOSED');
    }
    return status;
  }

  reply(item: OpsTicket): void {
    const body = this.replies[item.id]?.trim();
    if (!body || body.length < 2) {
      this.toast.show(this.locale.t('ops.ticket.needReply'));
      return;
    }
    this.api.opsCommentTicket(item.id, body).subscribe({
      next: (row) => {
        this.replace(row);
        this.replies[item.id] = '';
        this.toast.show(this.locale.t('ops.ticket.toast.replied'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ticket.toast.replyFail'))),
    });
  }

  setTicketStatus(item: OpsTicket, status: 'SENT' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'): void {
    this.api.opsPatchTicket(item.id, { status }).subscribe({
      next: (row) => {
        this.replace(row);
        this.toast.show(this.locale.t('ops.ticket.toast.status'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ticket.toast.updateFail'))),
    });
  }

  claim(item: OpsTicket): void {
    this.api.opsPatchTicket(item.id, { claim: true }).subscribe({
      next: (row) => {
        this.replace(row);
        this.toast.show(this.locale.t('ops.ticket.toast.claimed'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ticket.toast.claimFail'))),
    });
  }

  openRoute(item: OpsTicket): void {
    this.routeTarget = item;
    this.routeDraft = { queue: (item.queue as 'OPS' | 'FINANCE' | 'ADMIN') || 'ADMIN', note: '' };
  }

  submitRoute(): void {
    const item = this.routeTarget;
    if (!item) {
      return;
    }
    if (this.routeDraft.note.trim().length < 2) {
      this.toast.show(this.locale.t('ops.ticket.needNote'));
      return;
    }
    this.api
      .opsPatchTicket(item.id, {
        queue: this.routeDraft.queue,
        note: this.routeDraft.note,
        status: item.status === 'SENT' ? 'IN_PROGRESS' : undefined,
      })
      .subscribe({
        next: (row) => {
          this.replace(row);
          this.routeTarget = null;
          this.toast.show(this.locale.t('ops.ticket.toast.routed'));
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ticket.toast.routeFail'))),
      });
  }

  private replace(row: OpsTicket): void {
    this.items = this.items.map((item) => (item.id === row.id ? row : item));
    if (
      (this.status && row.status !== this.status) ||
      (this.queue && row.queue !== this.queue) ||
      (this.accountType && row.owner.accountType !== this.accountType) ||
      (this.mineOnly && row.assignee?.id !== this.meId) ||
      (this.escalatedOnly && row.priority !== 1)
    ) {
      this.items = this.items.filter((item) => item.id !== row.id);
      this.selected = null;
      return;
    }
    this.selected = keepSelected(this.items, row);
  }

  private load(): void {
    this.loading = true;
    this.api.opsTickets({
      status: this.status || undefined,
      priority: this.escalatedOnly ? 1 : undefined,
      queue: this.queue || undefined,
      mine: this.mineOnly || undefined,
      accountType: this.accountType || undefined,
    }).subscribe({
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
        this.toast.show(apiMessage(err, this.locale.t('ops.ticket.toast.loadFail')));
      },
    });
  }
}
