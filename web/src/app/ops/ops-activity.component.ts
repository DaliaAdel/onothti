import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsTeamActivityRow } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-ops-activity',
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>{{ locale.t('ops.act.heading') }}</h2>
        <p>{{ locale.t('ops.act.intro') }}</p>
      </div>
    </div>
    @if (loading) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else if (!rows.length) {
      <p class="page-empty">{{ locale.t('ops.act.empty') }}</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>{{ locale.t('ops.act.col.actor') }}</th>
              <th>{{ locale.t('ops.ui.team') }}</th>
              <th>{{ locale.t('ops.act.col.media') }}</th>
              <th>{{ locale.t('ops.act.col.tickets') }}</th>
              <th>{{ locale.t('ops.act.col.accounts') }}</th>
              <th>{{ locale.t('ops.act.col.other') }}</th>
              <th>{{ locale.t('ops.act.col.total') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of rows; track item.actorId) {
              <tr>
                <td>
                  <b>{{ item.displayName }}</b>
                  <div class="muted small">{{ item.accountCode }}</div>
                </td>
                <td>{{ teamLabel(item.team) }}</td>
                <td>{{ item.media }}</td>
                <td>{{ item.tickets }}</td>
                <td>{{ item.accounts }}</td>
                <td>{{ item.other }}</td>
                <td><b>{{ item.total }}</b></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class OpsActivityComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  loading = true;
  rows: OpsTeamActivityRow[] = [];

  ngOnInit(): void {
    this.shell.set('ops.activity.title', 'ops.activity.sub');
    this.api.opsTeamActivity().subscribe({
      next: (res) => {
        this.rows = res.rows;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.act.toast.loadFail')));
      },
    });
  }

  teamLabel(team: string): string {
    if (team === 'FINANCE') {
      return this.locale.t('ops.queue.finance');
    }
    if (team === 'ADMIN') {
      return this.locale.t('ops.queue.admin');
    }
    return this.locale.t('ops.queue.ops');
  }
}
