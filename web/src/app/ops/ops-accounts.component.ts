import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsManagedAccount, OpsPendingProvider } from '../core/models';
import { LocaleService } from '../core/locale.service';
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
          <h2>{{ locale.t('ops.acc.heading') }}</h2>
          <p>{{ locale.t('ops.acc.intro') }}</p>
        </div>
      </div>

      @if (loading) {
        <p class="loading">{{ locale.t('ui.loading') }}</p>
      } @else if (!pending.length) {
        <p class="page-empty">{{ locale.t('ops.acc.empty') }}</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>{{ locale.t('ops.ui.name') }}</th>
                <th>{{ locale.t('ops.ui.code') }}</th>
                <th>{{ locale.t('ops.ui.mobile') }}</th>
                <th>{{ locale.t('ops.ui.city') }}</th>
                <th>{{ locale.t('ops.ui.status') }}</th>
                <th>{{ locale.t('ops.ui.date') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (item of pending; track item.id) {
                <tr (click)="openFile(item)">
                  <td><b>{{ item.displayName }}</b></td>
                  <td>{{ item.accountCode }}</td>
                  <td dir="ltr">{{ item.mobile }}</td>
                  <td>{{ locale.localizedName(item.city) || '—' }}</td>
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
          <button class="text-link back" type="button" (click)="closeFile()">{{ locale.t('ops.acc.back') }}</button>
          <h2>{{ selected.displayName }}</h2>
          <p>{{ locale.t('ops.acc.viewOnly') }}</p>
        </div>
      </div>
      @if (detailLoading) {
        <p class="loading">{{ locale.t('ops.appr.fileLoading') }}</p>
      }
      <app-ops-account-file [account]="selected" />
      <div class="ops-drawer-actions">
        <button class="btn primary" type="button" (click)="review(true)">{{ locale.t('ops.acc.approve') }}</button>
        <button class="btn ghost" type="button" (click)="review(false)">{{ locale.t('ops.acc.stop') }}</button>
      </div>
    }
  `,
})
export class OpsAccountsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;

  pending: OpsPendingProvider[] = [];
  selected: OpsManagedAccount | null = null;
  loading = true;
  detailLoading = false;

  ngOnInit(): void {
    this.shell.set('ops.accounts.title', 'ops.accounts.sub');
    this.loadPending();
  }

  openFile(item: OpsPendingProvider): void {
    this.detailLoading = true;
    this.api.opsAccount(item.id).subscribe({
      next: (row) => {
        this.selected = row;
        this.shell.set(row.displayName, this.locale.t('ops.providerFile'));
        this.detailLoading = false;
      },
      error: (err) => {
        this.detailLoading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.acc.toast.fileFail')));
      },
    });
  }

  closeFile(): void {
    this.selected = null;
    this.shell.set('ops.accounts.title', 'ops.accounts.sub');
  }

  review(approve: boolean): void {
    if (!this.selected) {
      return;
    }
    this.api.opsReviewProvider(this.selected.id, approve).subscribe({
      next: () => {
        this.toast.show(approve ? this.locale.t('ops.appr.toast.accountOk') : this.locale.t('ops.appr.toast.accountStop'));
        this.selected = null;
        this.shell.set('ops.accounts.title', 'ops.accounts.sub');
        this.loadPending();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.appr.toast.accountFail'))),
    });
  }

  statusAr(status: string): string {
    const key = `ops.status.${status}`;
    const label = this.locale.t(key);
    return label === key ? status : label;
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
        this.toast.show(apiMessage(err, this.locale.t('ops.acc.toast.loadFail')));
      },
    });
  }
}
