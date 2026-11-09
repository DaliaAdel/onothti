import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsBankAccount, OpsWelcome } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { PositiveIntDirective } from './positive-int.directive';
import { clip, keepSelected } from './ops-ui';

type SettingKind = 'text' | 'number' | 'idle';
type IdleUnit = 'day' | 'month' | 'year';

const SETTING_META: { key: string; label: string; hint: string; kind: SettingKind }[] = [
  { key: 'whatsapp_disclaimer', label: 'ops.set.whatsapp', hint: 'ops.set.whatsappHint', kind: 'text' },
  { key: 'whatsapp_disclaimer_en', label: 'ops.set.whatsappEn', hint: 'ops.set.whatsappEnHint', kind: 'text' },
  { key: 'otp_ttl_seconds', label: 'ops.set.otp', hint: 'ops.set.otpHint', kind: 'number' },
  { key: 'idle_customer', label: 'ops.set.idleCustomer', hint: 'ops.set.idleCustomerHint', kind: 'idle' },
  { key: 'idle_provider', label: 'ops.set.idleProvider', hint: 'ops.set.idleProviderHint', kind: 'idle' },
  { key: 'provider_bio_max', label: 'ops.set.bioProvider', hint: 'ops.set.bioProviderHint', kind: 'number' },
  { key: 'customer_bio_max', label: 'ops.set.bioCustomer', hint: 'ops.set.bioCustomerHint', kind: 'number' },
  { key: 'rating_note_max', label: 'ops.set.ratingNote', hint: 'ops.set.ratingNoteHint', kind: 'number' },
  { key: 'terms_version', label: 'ops.set.terms', hint: 'ops.set.termsHint', kind: 'number' },
];

function parseIdle(value: string, fallback = 90): { amount: number; unit: IdleUnit } {
  const [amountPart, unitPart] = (value || '').trim().split(/\s+/);
  const amount = Number(amountPart);
  const unit = unitPart === 'month' || unitPart === 'year' ? unitPart : 'day';
  return { amount: Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : fallback, unit };
}

function unitKey(unit: IdleUnit): string {
  if (unit === 'month') {
    return 'ops.set.unit.month';
  }
  if (unit === 'year') {
    return 'ops.set.unit.year';
  }
  return 'ops.set.unit.day';
}

const BANK_LETTERS_RE = /[^\p{L}\s]/gu;
const BANK_NAME_RE = /^[\p{L}]+(?:\s+[\p{L}]+)*$/u;
const BANK_IBAN_RE = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{15,34}$/;

type BankFieldErrors = { bankName: string; iban: string; accountName: string };

function emptyBankErrors(): BankFieldErrors {
  return { bankName: '', iban: '', accountName: '' };
}

function lettersOnly(value: string): string {
  return value.replace(BANK_LETTERS_RE, '').replace(/ {2,}/g, ' ');
}

function ibanOnly(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 34);
}

function writeSanitized(event: Event, sanitize: (value: string) => string): string {
  const input = event.target as HTMLInputElement;
  const next = sanitize(input.value);
  if (input.value !== next) {
    const pos = Math.min(input.selectionStart ?? next.length, next.length);
    input.value = next;
    input.setSelectionRange(pos, pos);
  }
  return next;
}

function bankNameError(value: string): string {
  return BANK_NAME_RE.test(value.trim()) && value.trim().length >= 2 ? '' : 'ops.set.err.bankName';
}

function accountNameError(value: string): string {
  return BANK_NAME_RE.test(value.trim()) && value.trim().length >= 2 ? '' : 'ops.set.err.accountName';
}

function ibanError(value: string): string {
  return BANK_IBAN_RE.test(ibanOnly(value)) ? '' : 'ops.set.err.iban';
}

@Component({
  selector: 'app-ops-settings',
  imports: [FormsModule, OpsDrawerComponent, OpsModalComponent, PositiveIntDirective],
  template: `
    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.set.heading') }}</h2>
        <p>{{ locale.t('ops.set.intro') }}</p>
      </div>
    </div>
    @if (loading) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>{{ locale.t('ops.set.col.setting') }}</th>
              <th>{{ locale.t('ops.set.col.value') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of settingRows; track item.key) {
              <tr [class.active]="selectedSetting?.key === item.key" (click)="selectedSetting = item">
                <td><b>{{ locale.t(item.label) }}</b></td>
                <td class="clip">{{ displayValue(item) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <app-ops-drawer
      [open]="!!selectedSetting"
      [title]="selectedSetting ? locale.t(selectedSetting.label) : ''"
      [kicker]="selectedSetting ? locale.t(selectedSetting.hint) : ''"
      (closed)="selectedSetting = null"
    >
      @if (selectedSetting; as item) {
        @if (item.kind === 'idle') {
          <div class="form-grid">
            <div class="field">
              <label>{{ locale.t('ops.set.amount') }}</label>
              <input class="input" inputmode="numeric" positiveInt [(ngModel)]="idleAfter[item.key]" />
            </div>
            <div class="field">
              <label>{{ locale.t('ops.set.unit') }}</label>
              <select class="input" [(ngModel)]="idleUnit[item.key]">
                <option value="day">{{ locale.t('ops.set.unit.day') }}</option>
                <option value="month">{{ locale.t('ops.set.unit.month') }}</option>
                <option value="year">{{ locale.t('ops.set.unit.year') }}</option>
              </select>
            </div>
          </div>
        } @else if (item.kind === 'number') {
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="values[item.key]" />
        } @else {
          <textarea class="input" rows="4" [(ngModel)]="values[item.key]"></textarea>
        }
        <div class="ops-drawer-actions">
          @if (canManage) {
            <button class="btn primary" type="button" (click)="saveSetting(item)">{{ locale.t('ui.save') }}</button>
          }
        </div>
      }
    </app-ops-drawer>

    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.set.welcomeTitle') }}</h2>
        <p>{{ locale.t('ops.set.welcomeSub') }}</p>
      </div>
      @if (canManage) {
        <button class="btn primary" type="button" (click)="addingWelcome = true">{{ locale.t('ops.set.addWelcome') }}</button>
      }
    </div>
    <div class="ops-table-wrap" style="margin-bottom:18px">
      <table class="ops-table">
        <thead>
          <tr>
            <th>{{ locale.t('ops.set.col.audience') }}</th>
            <th>{{ locale.t('ops.set.col.msgKind') }}</th>
            <th>{{ locale.t('ops.set.col.content') }}</th>
            <th>{{ locale.t('ops.ui.status') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (item of welcome; track item.id) {
            <tr [class.active]="selectedWelcome?.id === item.id" (click)="selectedWelcome = item">
              <td><b>{{ audienceLabel(item.audience) }}</b></td>
              <td>{{ kindLabel(item.kind) }}</td>
              <td class="clip">{{ clip(item.bodyAr) }}</td>
              <td><span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? locale.t('ops.ui.visible') : locale.t('ops.status.paused') }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <app-ops-drawer
      [open]="!!selectedWelcome"
      [title]="selectedWelcome ? audienceLabel(selectedWelcome.audience) + ' · ' + kindLabel(selectedWelcome.kind) : ''"
      [kicker]="locale.t('ops.set.welcomeKicker')"
      (closed)="selectedWelcome = null"
    >
      @if (selectedWelcome; as item) {
        <textarea class="input" rows="5" maxlength="400" [(ngModel)]="item.bodyAr"></textarea>
        <div class="ops-drawer-actions">
          @if (canManage) {
            <button class="btn primary" type="button" (click)="saveWelcome(item)">{{ locale.t('ui.save') }}</button>
            <button class="btn ghost" type="button" (click)="toggleWelcome(item)">
              {{ item.isActive ? locale.t('ops.ui.hide') : locale.t('ops.ui.show') }}
            </button>
          }
        </div>
      }
    </app-ops-drawer>

    <app-ops-modal [open]="addingWelcome" [title]="locale.t('ops.set.addWelcomeTitle')" [kicker]="locale.t('ops.set.addWelcomeKicker')" (closed)="addingWelcome = false">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.audience') }}</label>
          <select class="input" [(ngModel)]="welcomeDraft.audience">
            <option value="CUSTOMER">{{ locale.t('ops.type.customer') }}</option>
            <option value="PROVIDER">{{ locale.t('ops.type.provider') }}</option>
            <option value="ALL">{{ locale.t('ops.set.audience.all') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.kind') }}</label>
          <select class="input" [(ngModel)]="welcomeDraft.kind">
            <option value="WELCOME">{{ locale.t('ops.set.kind.welcome') }}</option>
            <option value="MOTIVATIONAL">{{ locale.t('ops.set.kind.motivational') }}</option>
          </select>
        </div>
        <div class="field full">
          <label>{{ locale.t('ops.ui.body') }}</label>
          <textarea class="input" rows="3" [(ngModel)]="welcomeDraft.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createWelcome()">{{ locale.t('ops.set.addWelcomeSubmit') }}</button>
    </app-ops-modal>

    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.set.bankTitle') }}</h2>
        <p>{{ locale.t('ops.set.bankSub') }}</p>
      </div>
      @if (canManage) {
        <button class="btn primary" type="button" (click)="openAddBank()">{{ locale.t('ops.set.addBank') }}</button>
      }
    </div>
    <div class="ops-table-wrap" style="margin-bottom:18px">
      <table class="ops-table">
        <thead>
          <tr>
            <th>{{ locale.t('ops.set.col.bank') }}</th>
            <th>{{ locale.t('ops.set.col.iban') }}</th>
            <th>{{ locale.t('ops.set.col.beneficiary') }}</th>
            <th>{{ locale.t('ops.ui.status') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (item of banks; track item.id) {
            <tr [class.active]="selectedBank?.id === item.id" (click)="selectBank(item)">
              <td><b>{{ item.bankName }}</b></td>
              <td dir="ltr">{{ item.iban }}</td>
              <td>{{ item.accountName }}</td>
              <td><span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? locale.t('ops.status.shownBank') : locale.t('ops.status.pausedBank') }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <app-ops-drawer
      [open]="!!selectedBank"
      [title]="selectedBank?.bankName || ''"
      [kicker]="locale.t('ops.set.bankKicker')"
      (closed)="selectedBank = null"
    >
      @if (selectedBank; as item) {
        <div class="form-grid">
          <div class="field">
            <label>{{ locale.t('ops.set.col.bank') }}</label>
            <input
              class="input"
              [class.invalid]="!!editBankErrors.bankName"
              [value]="item.bankName"
              (input)="onEditBankName(item, $event)"
              (blur)="validateEditBankName(item)"
              maxlength="80"
              autocomplete="off"
            />
            @if (editBankErrors.bankName) {
              <p class="field-error">{{ locale.t(editBankErrors.bankName) }}</p>
            }
          </div>
          <div class="field">
            <label>{{ locale.t('ops.set.beneficiaryName') }}</label>
            <input
              class="input"
              [class.invalid]="!!editBankErrors.accountName"
              [value]="item.accountName"
              (input)="onEditAccountName(item, $event)"
              (blur)="validateEditAccountName(item)"
              maxlength="80"
              autocomplete="off"
            />
            @if (editBankErrors.accountName) {
              <p class="field-error">{{ locale.t(editBankErrors.accountName) }}</p>
            }
          </div>
          <div class="field full">
            <label>{{ locale.t('ops.set.col.iban') }}</label>
            <input
              class="input"
              dir="ltr"
              lang="en"
              [class.invalid]="!!editBankErrors.iban"
              [value]="item.iban"
              (input)="onEditIban(item, $event)"
              (blur)="validateEditIban(item)"
              maxlength="34"
              spellcheck="false"
              autocomplete="off"
              placeholder="SA0000000000000000000000"
            />
            @if (editBankErrors.iban) {
              <p class="field-error">{{ locale.t(editBankErrors.iban) }}</p>
            }
          </div>
        </div>
        @if (canManage) {
          <div class="ops-drawer-actions">
            <button class="btn primary" type="button" (click)="saveBank(item)">{{ locale.t('ui.save') }}</button>
            <button class="btn ghost" type="button" (click)="toggleBank(item)">
              {{ item.isActive ? locale.t('ops.ui.stop') : locale.t('ops.ui.enable') }}
            </button>
          </div>
        }
      }
    </app-ops-drawer>
    <app-ops-modal [open]="addingBank" [title]="locale.t('ops.set.addBankTitle')" [kicker]="locale.t('ops.set.addBankKicker')" (closed)="closeAddBank()">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.set.col.bank') }}</label>
          <input
            class="input"
            [class.invalid]="!!bankDraftErrors.bankName"
            [value]="bankDraft.bankName"
            (input)="onDraftBankName($event)"
            (blur)="validateDraftBankName()"
            maxlength="80"
            autocomplete="off"
          />
          @if (bankDraftErrors.bankName) {
            <p class="field-error">{{ locale.t(bankDraftErrors.bankName) }}</p>
          }
        </div>
        <div class="field">
          <label>{{ locale.t('ops.set.beneficiaryName') }}</label>
          <input
            class="input"
            [class.invalid]="!!bankDraftErrors.accountName"
            [value]="bankDraft.accountName"
            (input)="onDraftAccountName($event)"
            (blur)="validateDraftAccountName()"
            maxlength="80"
            autocomplete="off"
          />
          @if (bankDraftErrors.accountName) {
            <p class="field-error">{{ locale.t(bankDraftErrors.accountName) }}</p>
          }
        </div>
        <div class="field full">
          <label>{{ locale.t('ops.set.col.iban') }}</label>
          <input
            class="input"
            dir="ltr"
            lang="en"
            [class.invalid]="!!bankDraftErrors.iban"
            [value]="bankDraft.iban"
            (input)="onDraftIban($event)"
            (blur)="validateDraftIban()"
            maxlength="34"
            spellcheck="false"
            autocomplete="off"
            placeholder="SA0000000000000000000000"
          />
          @if (bankDraftErrors.iban) {
            <p class="field-error">{{ locale.t(bankDraftErrors.iban) }}</p>
          }
        </div>
      </div>
      <button class="btn primary" style="margin-top:8px;width:100%" type="button" (click)="createBank()">{{ locale.t('ops.set.addBankSubmit') }}</button>
    </app-ops-modal>
  `,
})
export class OpsSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  get canManage(): boolean {
    return this.session.hasAnyPermission('RAT-05', 'SETTINGS_MANAGE');
  }

  readonly clip = clip;

  loading = true;
  values: Record<string, string> = {};
  idleAfter: Record<string, number> = {};
  idleUnit: Record<string, IdleUnit> = {};
  selectedSetting: (typeof SETTING_META)[number] | null = null;
  selectedWelcome: OpsWelcome | null = null;
  selectedBank: OpsBankAccount | null = null;
  welcome: OpsWelcome[] = [];
  welcomeDraft = { audience: 'CUSTOMER', kind: 'WELCOME', bodyAr: '' };
  banks: OpsBankAccount[] = [];
  bankDraft = { bankName: '', iban: '', accountName: '' };
  bankDraftErrors = emptyBankErrors();
  editBankErrors = emptyBankErrors();
  addingWelcome = false;
  addingBank = false;
  readonly settingRows = SETTING_META;

  ngOnInit(): void {
    this.shell.set('ops.settings.title', 'ops.settings.sub');
    this.load();
  }

  audienceLabel(value: string): string {
    if (value === 'CUSTOMER') {
      return this.locale.t('ops.type.customer');
    }
    if (value === 'PROVIDER') {
      return this.locale.t('ops.type.provider');
    }
    return this.locale.t('ops.set.audience.all');
  }

  kindLabel(value: string): string {
    return value === 'MOTIVATIONAL' ? this.locale.t('ops.set.kind.motivational') : this.locale.t('ops.set.kind.welcome');
  }

  displayValue(item: (typeof SETTING_META)[number]): string {
    if (item.kind === 'idle') {
      return `${this.idleAfter[item.key] ?? 90} ${this.locale.t(unitKey(this.idleUnit[item.key] ?? 'day'))}`;
    }
    return this.clip(this.values[item.key]);
  }

  saveSetting(item: (typeof SETTING_META)[number]): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    let value = this.values[item.key] ?? '';
    if (item.kind === 'idle') {
      const amount = Number(this.idleAfter[item.key]);
      if (!Number.isFinite(amount) || amount < 1) {
        this.toast.show(this.locale.t('ops.set.needIdle'));
        return;
      }
      const unit = this.idleUnit[item.key] ?? 'day';
      value = `${Math.floor(amount)} ${unit}`;
      this.values[item.key] = value;
    } else if (item.kind === 'number') {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 1) {
        this.toast.show(this.locale.t('ops.set.needNumber'));
        return;
      }
      value = String(Math.floor(amount));
      this.values[item.key] = value;
    }
    this.api.opsPatchSetting(item.key, value).subscribe({
      next: () => this.toast.show(this.locale.t('ops.set.toast.saved')),
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.saveFail'))),
    });
  }

  saveWelcome(item: OpsWelcome): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    const bodyAr = item.bodyAr.trim();
    if (bodyAr.length < 4) {
      this.toast.show(this.locale.t('ops.set.needMessage'));
      return;
    }
    this.api.opsPatchWelcome(item.id, { bodyAr }).subscribe({
      next: (row) => {
        item.bodyAr = row.bodyAr;
        this.toast.show(this.locale.t('ops.set.toast.welcomeSaved'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.welcomeSaveFail'))),
    });
  }

  toggleWelcome(item: OpsWelcome): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    this.api.opsPatchWelcome(item.id, { isActive: !item.isActive }).subscribe({
      next: (row) => {
        item.isActive = row.isActive;
        this.toast.show(row.isActive ? this.locale.t('ops.set.toast.welcomeShown') : this.locale.t('ops.set.toast.welcomeHidden'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.welcomeToggleFail'))),
    });
  }

  createWelcome(): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    if (this.welcomeDraft.bodyAr.trim().length < 4) {
      this.toast.show(this.locale.t('ops.set.needMessage'));
      return;
    }
    this.api.opsCreateWelcome(this.welcomeDraft).subscribe({
      next: () => {
        this.toast.show(this.locale.t('ops.set.toast.welcomeAdded'));
        this.welcomeDraft = { audience: 'CUSTOMER', kind: 'WELCOME', bodyAr: '' };
        this.addingWelcome = false;
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.welcomeAddFail'))),
    });
  }

  selectBank(item: OpsBankAccount): void {
    this.selectedBank = item;
    this.editBankErrors = emptyBankErrors();
  }

  openAddBank(): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    this.bankDraft = { bankName: '', iban: '', accountName: '' };
    this.bankDraftErrors = emptyBankErrors();
    this.addingBank = true;
  }

  closeAddBank(): void {
    this.addingBank = false;
    this.bankDraft = { bankName: '', iban: '', accountName: '' };
    this.bankDraftErrors = emptyBankErrors();
  }

  onDraftBankName(event: Event): void {
    this.bankDraft.bankName = writeSanitized(event, lettersOnly);
    if (this.bankDraftErrors.bankName) {
      this.bankDraftErrors.bankName = bankNameError(this.bankDraft.bankName);
    }
  }

  onDraftIban(event: Event): void {
    this.bankDraft.iban = writeSanitized(event, ibanOnly);
    if (this.bankDraftErrors.iban) {
      this.bankDraftErrors.iban = ibanError(this.bankDraft.iban);
    }
  }

  onDraftAccountName(event: Event): void {
    this.bankDraft.accountName = writeSanitized(event, lettersOnly);
    if (this.bankDraftErrors.accountName) {
      this.bankDraftErrors.accountName = accountNameError(this.bankDraft.accountName);
    }
  }

  validateDraftBankName(): void {
    this.bankDraftErrors.bankName = bankNameError(this.bankDraft.bankName);
  }

  validateDraftIban(): void {
    this.bankDraftErrors.iban = ibanError(this.bankDraft.iban);
  }

  validateDraftAccountName(): void {
    this.bankDraftErrors.accountName = accountNameError(this.bankDraft.accountName);
  }

  onEditBankName(item: OpsBankAccount, event: Event): void {
    item.bankName = writeSanitized(event, lettersOnly);
    if (this.editBankErrors.bankName) {
      this.editBankErrors.bankName = bankNameError(item.bankName);
    }
  }

  onEditIban(item: OpsBankAccount, event: Event): void {
    item.iban = writeSanitized(event, ibanOnly);
    if (this.editBankErrors.iban) {
      this.editBankErrors.iban = ibanError(item.iban);
    }
  }

  onEditAccountName(item: OpsBankAccount, event: Event): void {
    item.accountName = writeSanitized(event, lettersOnly);
    if (this.editBankErrors.accountName) {
      this.editBankErrors.accountName = accountNameError(item.accountName);
    }
  }

  validateEditBankName(item: OpsBankAccount): void {
    this.editBankErrors.bankName = bankNameError(item.bankName);
  }

  validateEditIban(item: OpsBankAccount): void {
    this.editBankErrors.iban = ibanError(item.iban);
  }

  validateEditAccountName(item: OpsBankAccount): void {
    this.editBankErrors.accountName = accountNameError(item.accountName);
  }

  saveBank(item: OpsBankAccount): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    item.bankName = lettersOnly(item.bankName).trim();
    item.iban = ibanOnly(item.iban);
    item.accountName = lettersOnly(item.accountName).trim();
    this.editBankErrors = {
      bankName: bankNameError(item.bankName),
      iban: ibanError(item.iban),
      accountName: accountNameError(item.accountName),
    };
    if (this.editBankErrors.bankName || this.editBankErrors.iban || this.editBankErrors.accountName) {
      this.toast.show(this.locale.t('ops.set.needBank'));
      return;
    }
    this.api.opsPatchBank(item.id, {
      bankName: item.bankName,
      iban: item.iban,
      accountName: item.accountName,
    }).subscribe({
      next: () => this.toast.show(this.locale.t('ops.set.toast.bankSaved')),
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.bankSaveFail'))),
    });
  }

  toggleBank(item: OpsBankAccount): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    this.api.opsPatchBank(item.id, { isActive: !item.isActive }).subscribe({
      next: (row) => {
        item.isActive = row.isActive;
        this.toast.show(row.isActive ? this.locale.t('ops.set.toast.bankVisible') : this.locale.t('ops.set.toast.bankStopped'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.bankToggleFail'))),
    });
  }

  createBank(): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    this.bankDraft.bankName = lettersOnly(this.bankDraft.bankName).trim();
    this.bankDraft.iban = ibanOnly(this.bankDraft.iban);
    this.bankDraft.accountName = lettersOnly(this.bankDraft.accountName).trim();
    this.bankDraftErrors = {
      bankName: bankNameError(this.bankDraft.bankName),
      iban: ibanError(this.bankDraft.iban),
      accountName: accountNameError(this.bankDraft.accountName),
    };
    if (this.bankDraftErrors.bankName || this.bankDraftErrors.iban || this.bankDraftErrors.accountName) {
      this.toast.show(this.locale.t('ops.set.needBank'));
      return;
    }
    this.api.opsCreateBank(this.bankDraft).subscribe({
      next: () => {
        this.toast.show(this.locale.t('ops.set.toast.bankAdded'));
        this.closeAddBank();
        this.loadBanks();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.bankAddFail'))),
    });
  }

  private load(): void {
    this.loading = true;
    this.api.opsSettings().subscribe({
      next: (rows) => {
        const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
        for (const item of SETTING_META) {
          if (item.kind === 'idle') {
            const fallback = item.key === 'idle_provider' ? `${map['idle_after_days'] || 90} day` : '90 day';
            const parsed = parseIdle(map[item.key] || fallback);
            this.idleAfter[item.key] = parsed.amount;
            this.idleUnit[item.key] = parsed.unit;
            this.values[item.key] = `${parsed.amount} ${parsed.unit}`;
          } else if (item.key === 'provider_bio_max') {
            this.values[item.key] = map[item.key] ?? '1000';
          } else if (item.key === 'customer_bio_max' || item.key === 'rating_note_max') {
            this.values[item.key] = map[item.key] ?? '300';
          } else {
            this.values[item.key] = map[item.key] ?? '';
          }
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.loadFail')));
      },
    });
    this.api.opsWelcome().subscribe({
      next: (rows) => {
        this.welcome = rows;
        this.selectedWelcome = keepSelected(this.welcome, this.selectedWelcome);
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.welcomeLoadFail'))),
    });
    this.loadBanks();
  }

  private loadBanks(): void {
    this.api.opsBankAccounts().subscribe({
      next: (rows) => {
        this.banks = rows;
        this.selectedBank = keepSelected(this.banks, this.selectedBank);
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.set.toast.bankLoadFail'))),
    });
  }
}
