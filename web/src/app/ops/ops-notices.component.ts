import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsManagedAccount } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsModalComponent } from './ops-modal.component';

type BroadcastAudience = 'CUSTOMER' | 'PROVIDER' | 'ALL';

@Component({
  selector: 'app-ops-notices',
  imports: [FormsModule, OpsModalComponent],
  template: `
    @if (canBroadcast) {
      <div class="section-head">
        <div>
          <h2>{{ locale.t('ops.notice.broadcastTitle') }}</h2>
          <p>{{ locale.t('ops.notice.broadcastSub') }}</p>
        </div>
        <button class="btn primary" type="button" (click)="openBroadcast()">{{ locale.t('ops.notice.sendBroadcast') }}</button>
      </div>
    }

    @if (canDirect) {
      <div class="section-head">
        <div>
          <h2>{{ locale.t('ops.notice.directTitle') }}</h2>
          <p>{{ locale.t('ops.notice.directSub') }}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          @if (canNotifyProvider) {
            <button class="btn ghost" type="button" (click)="openDirect('PROVIDER')">{{ locale.t('ops.notice.toProvider') }}</button>
          }
          @if (canNotifyCustomer) {
            <button class="btn ghost" type="button" (click)="openDirect('CUSTOMER')">{{ locale.t('ops.notice.toCustomer') }}</button>
          }
        </div>
      </div>
    }

    @if (!canBroadcast && !canDirect) {
      <p class="page-empty">{{ locale.t('ops.notice.noPerm') }}</p>
    }

    <app-ops-modal [open]="addingBroadcast" [title]="locale.t('ops.notice.broadcastTitle')" [kicker]="locale.t('ops.notice.broadcastKicker')" (closed)="addingBroadcast = false">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.audience') }}</label>
          <select class="input" [(ngModel)]="broadcast.audience">
            @for (option of broadcastOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.title') }}</label>
          <input class="input" [(ngModel)]="broadcast.titleAr" />
        </div>
        <div class="field full">
          <label>{{ locale.t('ops.ui.body') }}</label>
          <textarea class="input" rows="3" [(ngModel)]="broadcast.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="sendBroadcast()">{{ locale.t('ops.notice.send') }}</button>
    </app-ops-modal>

    <app-ops-modal
      [open]="addingDirect"
      [title]="directType === 'PROVIDER' ? locale.t('ops.notice.directProvider') : locale.t('ops.notice.directCustomer')"
      [kicker]="locale.t('ops.notice.directKicker')"
      (closed)="addingDirect = false"
    >
      <div class="field">
        <label>{{ locale.t('ui.search') }}</label>
        <input class="input" [(ngModel)]="directQ" [placeholder]="locale.t('ops.client.searchPh')" (keyup.enter)="searchDirect()" />
      </div>
      <button class="btn ghost" style="margin:10px 0 14px" type="button" (click)="searchDirect()">{{ locale.t('ui.search') }}</button>
      @if (directHits.length) {
        <div class="filters" style="margin:0 0 14px">
          @for (item of directHits; track item.id) {
            <button class="chip" type="button" [class.active]="directTarget?.id === item.id" (click)="directTarget = item">
              {{ item.displayName }} · {{ item.accountCode }}
            </button>
          }
        </div>
      }
      @if (directTarget) {
        <p class="muted small">{{ locale.tf('ops.notice.picked', { name: directTarget.displayName }) }} · <span dir="ltr">{{ directTarget.mobile }}</span></p>
      }
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.title') }}</label>
          <input class="input" [(ngModel)]="direct.titleAr" />
        </div>
        <div class="field full">
          <label>{{ locale.t('ops.ui.body') }}</label>
          <textarea class="input" rows="3" [(ngModel)]="direct.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="sendDirect()">{{ locale.t('ops.notice.send') }}</button>
    </app-ops-modal>
  `,
})
export class OpsNoticesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  broadcast = { audience: 'CUSTOMER' as BroadcastAudience, titleAr: '', bodyAr: '' };
  addingBroadcast = false;
  addingDirect = false;
  directType: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER';
  directQ = '';
  directHits: OpsManagedAccount[] = [];
  directTarget: OpsManagedAccount | null = null;
  direct = { titleAr: '', bodyAr: '' };

  get canBroadcastAll(): boolean {
    return this.session.hasPermission('NOT-02');
  }

  get canBroadcastProvider(): boolean {
    return this.session.hasPermission('NOT-04');
  }

  get canBroadcastCustomer(): boolean {
    return this.session.hasPermission('NOT-03');
  }

  get canNotifyProvider(): boolean {
    return this.session.hasPermission('NOT-01');
  }

  get canNotifyCustomer(): boolean {
    return this.session.hasPermission('NOT-01');
  }

  get canBroadcast(): boolean {
    return this.canBroadcastAll || this.canBroadcastProvider || this.canBroadcastCustomer;
  }

  get canDirect(): boolean {
    return this.canNotifyProvider || this.canNotifyCustomer;
  }

  get broadcastOptions(): { value: BroadcastAudience; label: string }[] {
    const options: { value: BroadcastAudience; label: string }[] = [];
    if (this.canBroadcastAll) {
      options.push({ value: 'ALL', label: this.locale.t('ops.notice.opt.all') });
    }
    if (this.canBroadcastProvider) {
      options.push({ value: 'PROVIDER', label: this.locale.t('ops.notice.opt.provider') });
    }
    if (this.canBroadcastCustomer) {
      options.push({ value: 'CUSTOMER', label: this.locale.t('ops.notice.opt.customer') });
    }
    return options;
  }

  ngOnInit(): void {
    this.shell.set('ops.notices.title', 'ops.notices.sub');
  }

  openBroadcast(): void {
    const first = this.broadcastOptions[0];
    if (!first) {
      this.toast.show(this.locale.t('ops.notice.noBroadcastPerm'));
      return;
    }
    this.broadcast = { audience: first.value, titleAr: '', bodyAr: '' };
    this.addingBroadcast = true;
  }

  openDirect(type: 'CUSTOMER' | 'PROVIDER'): void {
    if (type === 'PROVIDER' && !this.canNotifyProvider) {
      this.toast.show(this.locale.t('ops.client.noNotifyProvider'));
      return;
    }
    if (type === 'CUSTOMER' && !this.canNotifyCustomer) {
      this.toast.show(this.locale.t('ops.client.noNotifyCustomer'));
      return;
    }
    this.directType = type;
    this.directQ = '';
    this.directHits = [];
    this.directTarget = null;
    this.direct = { titleAr: '', bodyAr: '' };
    this.addingDirect = true;
  }

  searchDirect(): void {
    const q = this.directQ.trim();
    if (q.length < 2) {
      this.toast.show(this.locale.t('ops.notice.needQuery'));
      return;
    }
    this.api.opsAccounts({ q, accountType: this.directType }).subscribe({
      next: (rows) => {
        this.directHits = rows.slice(0, 8);
        this.directTarget = this.directHits.length === 1 ? this.directHits[0] : null;
        if (!this.directHits.length) {
          this.toast.show(this.locale.t('ops.notice.noMatch'));
        }
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.notice.searchFail'))),
    });
  }

  sendDirect(): void {
    if (!this.directTarget) {
      this.toast.show(this.locale.t('ops.notice.pickAccount'));
      return;
    }
    if (this.direct.titleAr.trim().length < 2 || this.direct.bodyAr.trim().length < 4) {
      this.toast.show(this.locale.t('ops.notice.needText'));
      return;
    }
    this.api.opsNotifyAccount(this.directTarget.id, this.direct).subscribe({
      next: () => {
        this.toast.show(this.locale.tf('ops.notice.toast.sentTo', { name: this.directTarget?.displayName ?? '' }));
        this.addingDirect = false;
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.notice.toast.sendFail'))),
    });
  }

  sendBroadcast(): void {
    if (!this.broadcastOptions.some((option) => option.value === this.broadcast.audience)) {
      this.toast.show(this.locale.t('ops.notice.noAudiencePerm'));
      return;
    }
    if (this.broadcast.titleAr.trim().length < 2 || this.broadcast.bodyAr.trim().length < 4) {
      this.toast.show(this.locale.t('ops.notice.needText'));
      return;
    }
    this.api.opsBroadcast(this.broadcast).subscribe({
      next: (res) => {
        this.toast.show(this.locale.tf('ops.notice.toast.sentN', { n: res.sent }));
        this.broadcast = { audience: this.broadcast.audience, titleAr: '', bodyAr: '' };
        this.addingBroadcast = false;
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.notice.toast.sendFail'))),
    });
  }
}
