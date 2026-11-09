import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsAuditEvent } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { LocaleDateDirective } from '../shared/locale-date.directive';
import { opsDate } from './ops-ui';

@Component({
  selector: 'app-ops-events',
  imports: [FormsModule, LocaleDateDirective],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>{{ locale.t('ops.evt.heading') }}</h2>
        <p>{{ locale.t('ops.evt.intro') }}</p>
      </div>
      <button class="btn ghost" type="button" (click)="exportCsv()" [disabled]="!items.length">{{ locale.t('ops.evt.export') }}</button>
    </div>
    <article class="card form-card" style="margin-bottom:18px">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ui.search') }}</label>
          <input class="input" [(ngModel)]="q" [placeholder]="locale.t('ops.evt.searchPh')" (keyup.enter)="load()" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.kind') }}</label>
          <select class="input" [(ngModel)]="action" (ngModelChange)="load()">
            <option value="">{{ locale.t('ops.ui.all') }}</option>
            <option value="STAFF_CREATE">{{ locale.t('ops.evt.STAFF_CREATE') }}</option>
            <option value="STAFF_UPDATE">{{ locale.t('ops.evt.STAFF_UPDATE') }}</option>
            <option value="STAFF_PASSWORD_RESET">{{ locale.t('ops.evt.STAFF_PASSWORD_RESET') }}</option>
            <option value="ACCOUNT_STATUS">{{ locale.t('ops.evt.ACCOUNT_STATUS') }}</option>
            <option value="ACCOUNT_PACKAGE">{{ locale.t('ops.evt.ACCOUNT_PACKAGE') }}</option>
            <option value="NOTIFY_ACCOUNT">{{ locale.t('ops.evt.NOTIFY_ACCOUNT') }}</option>
            <option value="TICKET_UPDATE">{{ locale.t('ops.evt.TICKET_UPDATE') }}</option>
            <option value="TICKET_ESCALATE">{{ locale.t('ops.evt.TICKET_ESCALATE') }}</option>
            <option value="TICKET_ROUTE">{{ locale.t('ops.evt.TICKET_ROUTE') }}</option>
            <option value="TICKET_CLAIM">{{ locale.t('ops.evt.TICKET_CLAIM') }}</option>
            <option value="MEDIA_APPROVE">{{ locale.t('ops.evt.MEDIA_APPROVE') }}</option>
            <option value="MEDIA_REJECT">{{ locale.t('ops.evt.MEDIA_REJECT') }}</option>
            <option value="PROVIDER_APPROVE">{{ locale.t('ops.evt.PROVIDER_APPROVE') }}</option>
            <option value="PROVIDER_REJECT">{{ locale.t('ops.evt.PROVIDER_REJECT') }}</option>
            <option value="PROFILE_UPDATE">{{ locale.t('ops.evt.PROFILE_UPDATE') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.evt.from') }}</label>
          <input class="input" type="date" [(ngModel)]="from" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.evt.to') }}</label>
          <input class="input" type="date" [(ngModel)]="to" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:14px" type="button" (click)="load()">{{ locale.t('ui.search') }}</button>
    </article>
    @if (loading) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else if (!items.length) {
      <p class="page-empty">{{ locale.t('ops.evt.empty') }}</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>{{ locale.t('ops.ui.date') }}</th>
              <th>{{ locale.t('ops.evt.col.actor') }}</th>
              <th>{{ locale.t('ops.evt.col.action') }}</th>
              <th>{{ locale.t('ops.evt.col.entity') }}</th>
              <th>{{ locale.t('ops.evt.col.result') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items; track item.id) {
              <tr>
                <td>{{ opsDate(item.createdAt) }}</td>
                <td>
                  <b>{{ item.actor?.displayName || locale.t('ops.evt.system') }}</b>
                  <div class="muted small">{{ item.actor?.accountCode || '—' }}</div>
                </td>
                <td>{{ actionLabel(item.action) }}</td>
                <td>{{ item.entity }}{{ item.entityId ? ' · ' + item.entityId.slice(0, 8) : '' }}</td>
                <td><span class="status success">{{ locale.t('ops.evt.ok') }}</span></td>
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
  readonly locale = inject(LocaleService);
  readonly opsDate = opsDate;

  loading = true;
  q = '';
  action = '';
  from = '';
  to = '';
  items: OpsAuditEvent[] = [];

  ngOnInit(): void {
    this.shell.set('ops.events.title', 'ops.events.sub');
    this.load();
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      STAFF_CREATE: 'ops.evt.STAFF_CREATE',
      STAFF_UPDATE: 'ops.evt.STAFF_UPDATE',
      STAFF_PASSWORD_RESET: 'ops.evt.STAFF_PASSWORD_RESET',
      ACCOUNT_STATUS: 'ops.evt.ACCOUNT_STATUS_CHG',
      ACCOUNT_PACKAGE: 'ops.evt.ACCOUNT_PACKAGE_CHG',
      NOTIFY_ACCOUNT: 'ops.evt.NOTIFY_ACCOUNT',
      TICKET_UPDATE: 'ops.evt.TICKET_UPDATE',
      TICKET_ESCALATE: 'ops.evt.TICKET_ESCALATE',
      TICKET_ROUTE: 'ops.evt.TICKET_ROUTE',
      TICKET_CLAIM: 'ops.evt.TICKET_CLAIM',
      MEDIA_APPROVE: 'ops.evt.MEDIA_APPROVE',
      MEDIA_REJECT: 'ops.evt.MEDIA_REJECT',
      PROVIDER_APPROVE: 'ops.evt.PROVIDER_APPROVE',
      PROVIDER_REJECT: 'ops.evt.PROVIDER_REJECT',
      PROFILE_UPDATE: 'ops.evt.PROFILE_UPDATE',
    };
    return map[action] ? this.locale.t(map[action]) : action;
  }

  exportCsv(): void {
    const header = [
      this.locale.t('ops.ui.date'),
      this.locale.t('ops.evt.col.actor'),
      this.locale.t('ops.ui.code'),
      this.locale.t('ops.evt.col.action'),
      this.locale.t('ops.evt.col.entity'),
    ];
    const lines = this.items.map((item) =>
      [
        item.createdAt,
        item.actor?.displayName || this.locale.t('ops.evt.system'),
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
        this.toast.show(apiMessage(err, this.locale.t('ops.evt.toast.loadFail')));
      },
    });
  }
}
