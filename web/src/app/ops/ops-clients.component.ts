import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage, isSaudiMobile, toMobile } from '../core/phone';
import type { CatalogPackage, OpsBannedPhone, OpsManagedAccount } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsAccountFileComponent } from './ops-account-file.component';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { keepSelected, newestFirst, opsDate, statusTone } from './ops-ui';

@Component({
  selector: 'app-ops-clients',
  imports: [FormsModule, OpsAccountFileComponent, OpsDrawerComponent, OpsModalComponent],
  template: `
    @if (!selected) {
      <div class="section-head">
        <div>
          <h2>{{ locale.t('ops.clients.title') }}</h2>
          <p>{{ locale.t('ops.client.intro') }}</p>
        </div>
      </div>

      <div class="filters">
        <button class="chip" type="button" [class.active]="accountType === ''" (click)="setType('')">{{ locale.t('ops.ui.all') }}</button>
        <button class="chip" type="button" [class.active]="accountType === 'PROVIDER'" (click)="setType('PROVIDER')">{{ locale.t('ops.client.providers') }}</button>
        <button class="chip" type="button" [class.active]="accountType === 'CUSTOMER'" (click)="setType('CUSTOMER')">{{ locale.t('ops.client.customers') }}</button>
      </div>

      <article class="card form-card" style="margin-bottom:18px">
        <div class="form-grid">
          <div class="field">
            <label>{{ locale.t('ui.search') }}</label>
            <input class="input" [(ngModel)]="q" [placeholder]="locale.t('ops.client.searchPh')" (keyup.enter)="search()" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.status') }}</label>
            <select class="input" [(ngModel)]="status" (ngModelChange)="search()">
              <option value="">{{ locale.t('ops.ui.all') }}</option>
              <option value="ACTIVE">{{ locale.t('ops.status.ACTIVE') }}</option>
              <option value="INACTIVE">{{ locale.t('ops.status.INACTIVE') }}</option>
              <option value="RESTRICTED">{{ locale.t('ops.status.RESTRICTED') }}</option>
              <option value="SUSPENDED">{{ locale.t('ops.status.disabled') }}</option>
              <option value="CANCELLED">{{ locale.t('ops.status.DELETED') }}</option>
            </select>
          </div>
        </div>
        <button class="btn primary" style="margin-top:14px" type="button" (click)="search()">{{ locale.t('ui.search') }}</button>
      </article>

      @if (loading) {
        <p class="loading">{{ locale.t('ui.loading') }}</p>
      } @else if (!accounts.length) {
        <p class="page-empty">{{ locale.t('ops.client.empty') }}</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>{{ locale.t('ops.ui.name') }}</th>
                <th>{{ locale.t('ops.ui.kind') }}</th>
                <th>{{ locale.t('ops.ui.code') }}</th>
                <th>{{ locale.t('ops.ui.mobile') }}</th>
                <th>{{ locale.t('ops.ui.city') }}</th>
                <th>{{ locale.t('ops.ui.package') }}</th>
                <th>{{ locale.t('ops.client.col.days') }}</th>
                <th>{{ locale.t('ops.ui.status') }}</th>
                <th>{{ locale.t('ops.ui.date') }}</th>
                @if (showNotifyColumn) {
                  <th>{{ notifyColumnLabel }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (item of accounts; track item.id) {
                <tr (click)="openAccount(item)">
                  <td><b>{{ item.displayName }}</b></td>
                  <td>{{ typeAr(item.accountType) }}</td>
                  <td>{{ item.accountCode }}</td>
                  <td dir="ltr">{{ item.mobile }}</td>
                  <td>{{ locale.localizedName(item.customerProfile?.city || item.providerProfile?.city, '—') }}</td>
                  <td>
                    @if (item.accountType === 'PROVIDER') {
                      {{ locale.localizedName(item.package, locale.t('ops.client.noPackage')) }}
                    } @else {
                      —
                    }
                  </td>
                  <td>
                    @if (item.accountType === 'PROVIDER') {
                      {{ remainingDaysLabel(item) }}
                      @if (item.subscriptionEndAt) {
                        <div class="muted small">{{ locale.tf('ops.client.until', { date: opsDate(item.subscriptionEndAt) }) }}</div>
                      }
                    } @else {
                      —
                    }
                  </td>
                  <td><span class="status {{ statusTone(item.status) }}">{{ statusAr(item.status) }}</span></td>
                  <td>{{ opsDate(item.createdAt) }}</td>
                  @if (showNotifyColumn) {
                    <td>
                      @if (canNotify(item)) {
                        <button class="btn ghost" type="button" (click)="onNotifyClick($event, item)">
                          {{ notifyLabel(item) }}
                        </button>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (canBan) {
        <div class="section-head">
          <div>
            <h2>{{ locale.t('ops.client.bannedTitle') }}</h2>
            <p>{{ locale.t('ops.client.bannedSub') }}</p>
          </div>
          <button class="btn primary" type="button" (click)="openBan()">{{ locale.t('ops.client.banAdd') }}</button>
        </div>
        @if (!banned.length) {
          <p class="page-empty">{{ locale.t('ops.client.bannedEmpty') }}</p>
        } @else {
          <div class="ops-table-wrap">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>{{ locale.t('ops.ui.mobile') }}</th>
                  <th>{{ locale.t('ops.ui.reason') }}</th>
                  <th>{{ locale.t('ops.client.col.by') }}</th>
                  <th>{{ locale.t('ops.ui.date') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of banned; track item.mobile) {
                  <tr [class.active]="selectedBan?.mobile === item.mobile" (click)="selectBan(item)">
                    <td dir="ltr"><b>{{ item.mobile }}</b></td>
                    <td class="clip">{{ item.reason }}</td>
                    <td>{{ item.createdBy?.displayName || '—' }}</td>
                    <td>{{ opsDate(item.createdAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    } @else {
      <div class="section-head">
        <div>
          <button class="text-link back" type="button" (click)="closeAccount()">{{ locale.t('ops.client.back') }}</button>
          <h2>{{ selected.displayName }}</h2>
          <p>{{ typeAr(selected.accountType) }} · {{ selected.accountCode }}</p>
        </div>
      </div>

      @if (detailLoading) {
        <p class="loading">{{ locale.t('ops.client.loadingFile') }}</p>
      }
      <app-ops-account-file [account]="selected" />

      @if (hasAccountsAction() || canNotify(selected)) {
        <div class="ops-drawer-actions" style="margin-top:16px">
          @if (hasAccountsAction()) {
            <button class="btn primary" type="button" (click)="openAction(selected)">{{ locale.t('ops.client.action') }}</button>
          }
          @if (canNotify(selected)) {
            <button class="btn ghost" type="button" (click)="openNotify(selected)">{{ notifyLabel(selected) }}</button>
          }
        </div>
      }
    }

    <app-ops-modal
      [open]="!!notifyTarget"
      [title]="notifyTarget ? notifyLabel(notifyTarget) : locale.t('ops.client.notify')"
      [kicker]="notifyTarget ? notifyTarget.displayName : ''"
      (closed)="notifyTarget = null"
    >
      @if (notifyTarget) {
        <p class="muted small">{{ notifyTarget.accountCode }} · <span dir="ltr">{{ notifyTarget.mobile }}</span></p>
      }
      <div class="field">
        <label>{{ locale.t('ops.ui.title') }}</label>
        <input class="input" [(ngModel)]="notifyDraft.titleAr" />
      </div>
      <div class="field">
        <label>{{ locale.t('ops.ui.body') }}</label>
        <textarea class="input" rows="3" [(ngModel)]="notifyDraft.bodyAr"></textarea>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="sendNotify()">{{ locale.t('ops.client.sendNotify') }}</button>
    </app-ops-modal>

    <app-ops-modal [open]="addingBan" [title]="locale.t('ops.client.banTitle')" [kicker]="locale.t('ops.client.banKicker')" (closed)="closeBan()">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.mobile') }}</label>
          <input
            class="input"
            dir="ltr"
            [class.invalid]="!!banMobileError"
            [ngModel]="banDraft.mobile"
            (ngModelChange)="onBanMobileChange($event)"
            (paste)="onBanMobilePaste($event)"
            (blur)="onBanMobileBlur()"
            inputmode="numeric"
            maxlength="10"
            placeholder="05xxxxxxxx"
            autocomplete="tel"
            [ngModelOptions]="{standalone: true}"
          />
          @if (banMobileError) {
            <p class="field-error">{{ banMobileError }}</p>
          }
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.reason') }}</label>
          <input class="input" [(ngModel)]="banDraft.reason" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="ban()">{{ locale.t('ops.client.banSubmit') }}</button>
    </app-ops-modal>
    <app-ops-drawer
      [open]="!!selectedBan"
      [title]="selectedBan?.mobile || ''"
      [kicker]="locale.t('ops.client.bannedKicker')"
      (closed)="selectedBan = null"
    >
      @if (selectedBan; as item) {
        <p class="muted small">{{ item.reason }}</p>
        <p class="muted small">{{ opsDate(item.createdAt) }} · {{ item.createdBy?.displayName || '' }}</p>
        <div class="ops-drawer-actions">
          <button class="btn ghost" type="button" (click)="unban(item.mobile)">{{ locale.t('ops.client.unban') }}</button>
        </div>
      }
    </app-ops-drawer>

    <app-ops-modal
      [open]="actionOpen"
      [title]="locale.t('ops.client.action')"
      [kicker]="selected ? selected.displayName : ''"
      (closed)="closeAction()"
    >
      @if (selected) {
        <p class="muted small">{{ locale.t('ops.client.actionHint') }}</p>
        <div class="form-grid">
          @if (statusOptions().length) {
            <div class="field">
              <label>{{ locale.t('ops.ui.status') }}</label>
              <select class="input" [(ngModel)]="nextStatus[selected.id]">
                @for (option of statusOptions(); track option.value) {
                  <option [value]="option.value">{{ locale.t(option.label) }}</option>
                }
              </select>
            </div>
          }
          @if (selected.accountType === 'PROVIDER' && canChangePackage()) {
            <div class="field">
              <label>{{ locale.t('ops.client.providerPkg') }}</label>
              <select class="input" [(ngModel)]="nextPackage[selected.id]">
                <option value="">{{ locale.t('ops.client.noChange') }}</option>
                @for (pkg of packages; track pkg.id) {
                  <option [value]="pkg.id">{{ locale.localizedName(pkg) }}</option>
                }
              </select>
            </div>
          }
        </div>
        @if (selected.accountType === 'PROVIDER' && selected.package) {
          <p class="muted small">
            {{ locale.tf('ops.client.current', { name: locale.localizedName(selected.package) }) }}@if (selected.subscriptionEndAt) { · {{ locale.tf('ops.client.until', { date: opsDate(selected.subscriptionEndAt) }) }} }
          </p>
        }
        <div class="field" style="margin-top:14px">
          <label>{{ locale.t('ops.client.reason') }}</label>
          <textarea class="input" rows="3" [(ngModel)]="reasons[selected.id]" [placeholder]="locale.t('ops.client.reasonPh')"></textarea>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="applyAccount(selected)">
          {{ locale.t('ops.client.saveAction') }}
        </button>
      }
    </app-ops-modal>
  `,
})
export class OpsClientsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;

  accounts: OpsManagedAccount[] = [];
  selected: OpsManagedAccount | null = null;
  loading = true;
  detailLoading = false;
  q = '';
  accountType = '';
  status = 'ACTIVE';
  packages: CatalogPackage[] = [];
  nextStatus: Record<string, string> = {};
  nextPackage: Record<string, string> = {};
  reasons: Record<string, string> = {};
  notifyTarget: OpsManagedAccount | null = null;
  notifyDraft = { titleAr: '', bodyAr: '' };
  actionOpen = false;
  banned: OpsBannedPhone[] = [];
  selectedBan: OpsBannedPhone | null = null;
  addingBan = false;
  banMobileTouched = false;
  banDraft = { mobile: '', reason: '' };

  ngOnInit(): void {
    this.shell.set('ops.clients.title', 'ops.clients.sub');
    if (this.canBan) {
      this.loadBanned();
    }
    this.api.packages().subscribe({
      next: (rows) => (this.packages = rows),
      error: () => undefined,
    });
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type === 'CUSTOMER' || type === 'PROVIDER') {
      this.accountType = type;
    }
    this.search();
  }

  setType(type: string): void {
    this.accountType = type;
    this.search();
  }

  openAccount(item: OpsManagedAccount): void {
    this.selected = item;
    this.nextStatus[item.id] ??= item.status === 'PENDING_APPROVAL' ? 'ACTIVE' : item.status;
    this.nextPackage[item.id] ??= item.package?.id ?? '';
    this.reasons[item.id] ??= '';
    this.shell.set(item.displayName, this.typeAr(item.accountType));
    this.loadFile(item.id);
  }

  closeAccount(): void {
    this.actionOpen = false;
    this.selected = null;
    this.shell.set('ops.clients.title', 'ops.clients.sub');
  }

  openAction(item: OpsManagedAccount): void {
    if (!this.hasAccountsAction()) {
      this.toast.show(this.locale.t('ops.client.noActionPerm'));
      return;
    }
    this.nextStatus[item.id] ??= item.status === 'PENDING_APPROVAL' ? 'ACTIVE' : item.status;
    this.nextPackage[item.id] ??= item.package?.id ?? '';
    this.reasons[item.id] ??= '';
    this.actionOpen = true;
  }

  closeAction(): void {
    this.actionOpen = false;
  }

  search(): void {
    this.loading = true;
    this.api
      .opsAccounts({
        q: this.q || undefined,
        accountType: this.accountType || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.accounts = newestFirst(rows);
          this.selected = keepSelected(this.accounts, this.selected);
          for (const row of rows) {
            this.nextStatus[row.id] ??= row.status === 'PENDING_APPROVAL' ? 'ACTIVE' : row.status;
            this.nextPackage[row.id] ??= row.package?.id ?? '';
            this.reasons[row.id] ??= '';
          }
          if (this.selected) {
            this.loadFile(this.selected.id);
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, this.locale.t('ops.client.toast.loadFail')));
        },
      });
  }

  get showNotifyColumn(): boolean {
    return this.session.hasAnyPermission('NOT-01');
  }

  get notifyColumnLabel(): string {
    const provider = this.session.hasPermission('NOT-01');
    const customer = this.session.hasPermission('NOT-01');
    if (provider && !customer) {
      return this.locale.t('ops.client.notifyProvider');
    }
    if (customer && !provider) {
      return this.locale.t('ops.client.notifyCustomer');
    }
    return this.locale.t('ops.client.notify');
  }

  canNotify(item: OpsManagedAccount): boolean {
    if (item.accountType === 'PROVIDER') {
      return this.session.hasPermission('NOT-01');
    }
    if (item.accountType === 'CUSTOMER') {
      return this.session.hasPermission('NOT-01');
    }
    return false;
  }

  notifyLabel(item: OpsManagedAccount): string {
    return item.accountType === 'PROVIDER' ? this.locale.t('ops.client.notifyProvider') : this.locale.t('ops.client.notifyCustomer');
  }

  onNotifyClick(event: Event, item: OpsManagedAccount): void {
    event.stopPropagation();
    this.openNotify(item);
  }

  openNotify(item: OpsManagedAccount): void {
    if (!this.canNotify(item)) {
      this.toast.show(
        item.accountType === 'PROVIDER'
          ? this.locale.t('ops.client.noNotifyProvider')
          : this.locale.t('ops.client.noNotifyCustomer'),
      );
      return;
    }
    this.notifyTarget = item;
    this.notifyDraft = { titleAr: '', bodyAr: '' };
  }

  sendNotify(): void {
    const item = this.notifyTarget;
    if (!item) {
      return;
    }
    if (this.notifyDraft.titleAr.trim().length < 2 || this.notifyDraft.bodyAr.trim().length < 4) {
      this.toast.show(this.locale.t('ops.client.needNotify'));
      return;
    }
    this.api.opsNotifyAccount(item.id, this.notifyDraft).subscribe({
      next: () => {
        this.toast.show(this.locale.tf('ops.client.toast.notifySent', { name: item.displayName }));
        this.notifyTarget = null;
        this.notifyDraft = { titleAr: '', bodyAr: '' };
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.client.toast.notifyFail'))),
    });
  }

  get canBan(): boolean {
    return this.session.hasAnyPermission('USR-04');
  }

  get banMobileError(): string {
    const mobile = toMobile(this.banDraft.mobile);
    if (!mobile) {
      return this.banMobileTouched ? this.locale.t('ops.ui.needMobile') : '';
    }
    if (isSaudiMobile(mobile)) {
      return '';
    }
    if (this.banMobileTouched || mobile.length >= 10 || !mobile.startsWith('05')) {
      return this.locale.t('ops.ui.needSaudiMobile');
    }
    return '';
  }

  selectBan(item: OpsBannedPhone): void {
    this.selectedBan = item;
  }

  openBan(): void {
    this.banMobileTouched = false;
    this.banDraft = { mobile: '', reason: '' };
    this.addingBan = true;
  }

  closeBan(): void {
    this.addingBan = false;
    this.banDraft = { mobile: '', reason: '' };
    this.banMobileTouched = false;
  }

  onBanMobileChange(value: string): void {
    this.banDraft.mobile = toMobile(value);
  }

  onBanMobilePaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.banDraft.mobile = toMobile(event.clipboardData?.getData('text') ?? '');
  }

  onBanMobileBlur(): void {
    this.banMobileTouched = true;
  }

  ban(): void {
    this.banMobileTouched = true;
    const mobile = toMobile(this.banDraft.mobile);
    if (!isSaudiMobile(mobile)) {
      return;
    }
    if (this.banDraft.reason.trim().length < 4) {
      this.toast.show(this.locale.t('ops.client.needBanReason'));
      return;
    }
    this.api.opsBanPhone({ mobile, reason: this.banDraft.reason }).subscribe({
      next: () => {
        this.toast.show(this.locale.t('ops.client.toast.banned'));
        this.closeBan();
        this.loadBanned();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.client.toast.banFail'))),
    });
  }

  unban(mobile: string): void {
    this.api.opsUnbanPhone(mobile).subscribe({
      next: () => {
        this.toast.show(this.locale.t('ops.client.toast.unbanned'));
        this.selectedBan = null;
        this.loadBanned();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.client.toast.unbanFail'))),
    });
  }

  hasAccountsAction(): boolean {
    return this.session.hasAnyPermission('USR-01', 'USR-05', 'USR-06') || this.canChangePackage();
  }

  canChangePackage(): boolean {
    return this.session.hasAnyPermission('USR-01', 'PKG-04');
  }

  statusOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    if (this.session.hasPermission('USR-01')) {
      options.push(
        { value: 'INACTIVE', label: 'ops.status.INACTIVE' },
        { value: 'ACTIVE', label: 'ops.status.ACTIVE' },
        { value: 'SUSPENDED', label: 'ops.status.disabled' },
        { value: 'CANCELLED', label: 'ops.status.cancelledDeleted' },
      );
    }
    if (this.session.hasPermission('USR-05')) {
      options.push(
        { value: 'RESTRICTED', label: 'ops.status.RESTRICTED' },
        { value: 'UNRESTRICTED', label: 'ops.status.UNRESTRICTED' },
      );
    }
    if (this.session.hasPermission('USR-06')) {
      options.push({ value: 'DELETED', label: 'ops.status.DELETED' });
    }
    return options;
  }

  applyAccount(item: OpsManagedAccount): void {
    if (!this.hasAccountsAction()) {
      this.toast.show(this.locale.t('ops.client.noActionPerm'));
      return;
    }
    const reason = (this.reasons[item.id] || '').trim();
    if (reason.length < 4) {
      this.toast.show(this.locale.t('ops.client.needReason'));
      return;
    }
    const status = this.nextStatus[item.id];
    const packageId = item.accountType === 'PROVIDER' ? this.nextPackage[item.id] || undefined : undefined;
    const statusChanged = Boolean(status && status !== item.status);
    const packageChanged = Boolean(packageId && packageId !== (item.package?.id || ''));
    if (!statusChanged && !packageChanged) {
      this.toast.show(this.locale.t('ops.client.noDiff'));
      return;
    }
    this.api
      .opsPatchAccount(item.id, {
        ...(statusChanged ? { status } : {}),
        ...(packageChanged ? { packageId } : {}),
        reason,
      })
      .subscribe({
        next: (row) => {
          this.selected = row;
          this.nextPackage[row.id] = row.package?.id ?? '';
          this.actionOpen = false;
          this.toast.show(this.locale.t('ops.client.toast.saved'));
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.client.toast.patchFail'))),
      });
  }

  remainingDaysLabel(item: OpsManagedAccount): string {
    if (!item.subscriptionEndAt) {
      return '—';
    }
    const date = new Date(item.subscriptionEndAt);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
    if (days === 0) {
      return this.locale.t('ops.client.expired');
    }
    return this.locale.tf('ops.ui.nDays', { n: days });
  }

  typeAr(type: string): string {
    if (type === 'PROVIDER') {
      return this.locale.t('ops.type.provider');
    }
    if (type === 'STAFF') {
      return this.locale.t('ops.type.staff');
    }
    return this.locale.t('ops.type.customer');
  }

  statusAr(status: string): string {
    const key = `ops.status.${status}`;
    const label = this.locale.t(key);
    return label === key ? status : label;
  }

  private loadBanned(): void {
    this.api.opsBannedPhones().subscribe({
      next: (rows) => {
        this.banned = newestFirst(rows);
        this.selectedBan = this.selectedBan
          ? this.banned.find((row) => row.mobile === this.selectedBan?.mobile) ?? null
          : null;
      },
      error: () => undefined,
    });
  }

  private loadFile(id: string): void {
    this.detailLoading = true;
    this.api.opsAccount(id).subscribe({
      next: (row) => {
        this.selected = row;
        this.shell.set(row.displayName, this.typeAr(row.accountType));
        this.detailLoading = false;
      },
      error: (err) => {
        this.detailLoading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.client.toast.fileFail')));
      },
    });
  }
}
