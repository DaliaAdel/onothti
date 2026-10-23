import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsBankAccount, OpsWelcome } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { clip, keepSelected } from './ops-ui';

type SettingKind = 'text' | 'number' | 'idle';
type IdleUnit = 'day' | 'month' | 'year';

const SETTING_META: { key: string; label: string; hint: string; kind: SettingKind }[] = [
  { key: 'whatsapp_disclaimer', label: 'تنبيه واتساب', hint: 'يظهر عند التواصل خارج المنصة', kind: 'text' },
  { key: 'whatsapp_disclaimer_en', label: 'تنبيه واتساب بالإنجليزي', hint: 'النص الإنجليزي لنفس التنبيه', kind: 'text' },
  { key: 'otp_ttl_seconds', label: 'مدة رمز التحقق (ثوانٍ)', hint: 'الرمز ينتهي بعد هذا العدد', kind: 'number' },
  {
    key: 'idle_customer',
    label: 'فترة خمول العميلة',
    hint: 'بعدها يُعد حساب العميلة غير نشط دون نشاط. حددي المدة واختاري يوم أو شهر أو سنة',
    kind: 'idle',
  },
  {
    key: 'idle_provider',
    label: 'فترة خمول الخبيرة',
    hint: 'بعد انتهاء الباقة، المدة قبل إخفاء الظهور. حددي المدة واختاري يوم أو شهر أو سنة',
    kind: 'idle',
  },
  { key: 'provider_bio_max', label: 'حد حروف نبذة الخبيرة', hint: 'الحد الأقصى لنص «نبذة عن» في ملف الخبيرة', kind: 'number' },
  { key: 'customer_bio_max', label: 'حد حروف نبذة العميلة', hint: 'الحد الأقصى لنص «نبذة عن» في حساب العميلة', kind: 'number' },
  { key: 'rating_note_max', label: 'حد حروف تقييم العميلة', hint: 'الحد الأقصى لتعليق التقييم الذي تكتبه العميلة', kind: 'number' },
  { key: 'terms_version', label: 'نسخة الشروط', hint: 'ارفع الرقم عند تحديث الشروط', kind: 'number' },
];

function parseIdle(value: string, fallback = 90): { amount: number; unit: IdleUnit } {
  const [amountPart, unitPart] = (value || '').trim().split(/\s+/);
  const amount = Number(amountPart);
  const unit = unitPart === 'month' || unitPart === 'year' ? unitPart : 'day';
  return { amount: Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : fallback, unit };
}

function unitLabel(unit: IdleUnit): string {
  if (unit === 'month') {
    return 'شهر';
  }
  if (unit === 'year') {
    return 'سنة';
  }
  return 'يوم';
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
  return BANK_NAME_RE.test(value.trim()) && value.trim().length >= 2 ? '' : 'اسم البنك حروف فقط';
}

function accountNameError(value: string): string {
  return BANK_NAME_RE.test(value.trim()) && value.trim().length >= 2 ? '' : 'اسم المستفيد حروف فقط';
}

function ibanError(value: string): string {
  return BANK_IBAN_RE.test(ibanOnly(value)) ? '' : 'الآيبان مزيج من الحروف والأرقام';
}

@Component({
  selector: 'app-ops-settings',
  imports: [FormsModule, OpsDrawerComponent, OpsModalComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>إعدادات التشغيل</h2>
        <p>نصوص المنصة والمدد التي تظهر للعميلة والخبيرة</p>
      </div>
    </div>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الإعداد</th>
              <th>القيمة</th>
            </tr>
          </thead>
          <tbody>
            @for (item of settingRows; track item.key) {
              <tr [class.active]="selectedSetting?.key === item.key" (click)="selectedSetting = item">
                <td><b>{{ item.label }}</b></td>
                <td class="clip">{{ displayValue(item) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <app-ops-drawer
      [open]="!!selectedSetting"
      [title]="selectedSetting?.label || ''"
      [kicker]="selectedSetting?.hint || ''"
      (closed)="selectedSetting = null"
    >
      @if (selectedSetting; as item) {
        @if (item.kind === 'idle') {
          <div class="form-grid">
            <div class="field">
              <label>المدة</label>
              <input class="input" type="number" min="1" [(ngModel)]="idleAfter[item.key]" />
            </div>
            <div class="field">
              <label>الوحدة</label>
              <select class="input" [(ngModel)]="idleUnit[item.key]">
                <option value="day">يوم</option>
                <option value="month">شهر</option>
                <option value="year">سنة</option>
              </select>
            </div>
          </div>
        } @else if (item.kind === 'number') {
          <input class="input" type="number" min="1" [(ngModel)]="values[item.key]" />
        } @else {
          <textarea class="input" rows="4" [(ngModel)]="values[item.key]"></textarea>
        }
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveSetting(item)">حفظ</button>
        </div>
      }
    </app-ops-drawer>

    <div class="section-head">
      <div>
        <h2>رسائل الترحيب</h2>
        <p>إدارة رسائل الترحيب والتحفيز التى تظهر للعميلة والخبيرة عند تسجيل الدخول</p>
      </div>
      <button class="btn primary" type="button" (click)="addingWelcome = true">+ إضافة رسالة</button>
    </div>
    <div class="ops-table-wrap" style="margin-bottom:18px">
      <table class="ops-table">
        <thead>
          <tr>
            <th>الجمهور المستهدف</th>
            <th>نوع الرسالة</th>
            <th>محتوى الرسالة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          @for (item of welcome; track item.id) {
            <tr [class.active]="selectedWelcome?.id === item.id" (click)="selectedWelcome = item">
              <td><b>{{ audienceLabel(item.audience) }}</b></td>
              <td>{{ kindLabel(item.kind) }}</td>
              <td class="clip">{{ clip(item.bodyAr) }}</td>
              <td><span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? 'ظاهرة' : 'متوقفة' }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <app-ops-drawer
      [open]="!!selectedWelcome"
      [title]="selectedWelcome ? audienceLabel(selectedWelcome.audience) + ' · ' + kindLabel(selectedWelcome.kind) : ''"
      kicker="رسالة ترحيب"
      (closed)="selectedWelcome = null"
    >
      @if (selectedWelcome; as item) {
        <textarea class="input" rows="5" maxlength="400" [(ngModel)]="item.bodyAr"></textarea>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveWelcome(item)">حفظ</button>
          <button class="btn ghost" type="button" (click)="toggleWelcome(item)">
            {{ item.isActive ? 'إخفاء' : 'إظهار' }}
          </button>
        </div>
      }
    </app-ops-drawer>

    <app-ops-modal [open]="addingWelcome" title="إضافة رسالة" kicker="ترحيب وتحفيز" (closed)="addingWelcome = false">
      <div class="form-grid">
        <div class="field">
          <label>الجمهور</label>
          <select class="input" [(ngModel)]="welcomeDraft.audience">
            <option value="CUSTOMER">العميلة</option>
            <option value="PROVIDER">الخبيرة</option>
            <option value="ALL">الكل</option>
          </select>
        </div>
        <div class="field">
          <label>النوع</label>
          <select class="input" [(ngModel)]="welcomeDraft.kind">
            <option value="WELCOME">ترحيب</option>
            <option value="MOTIVATIONAL">تحفيز</option>
          </select>
        </div>
        <div class="field full">
          <label>النص</label>
          <textarea class="input" rows="3" [(ngModel)]="welcomeDraft.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createWelcome()">إضافة الرسالة</button>
    </app-ops-modal>

    <div class="section-head">
      <div>
        <h2>الحساب البنكي للمنصة</h2>
        <p>إدارة بيانات الحساب البنكي التى تظهر للخبيرة عند سداد قيمة الاشتراك او تجديد الباقة</p>
      </div>
      <button class="btn primary" type="button" (click)="openAddBank()">+ إضافة حساب</button>
    </div>
    <div class="ops-table-wrap" style="margin-bottom:18px">
      <table class="ops-table">
        <thead>
          <tr>
            <th>البنك</th>
            <th>الآيبان</th>
            <th>المستفيد</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          @for (item of banks; track item.id) {
            <tr [class.active]="selectedBank?.id === item.id" (click)="selectBank(item)">
              <td><b>{{ item.bankName }}</b></td>
              <td dir="ltr">{{ item.iban }}</td>
              <td>{{ item.accountName }}</td>
              <td><span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? 'ظاهر' : 'متوقف' }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <app-ops-drawer
      [open]="!!selectedBank"
      [title]="selectedBank?.bankName || ''"
      kicker="حساب بنكي"
      (closed)="selectedBank = null"
    >
      @if (selectedBank; as item) {
        <div class="form-grid">
          <div class="field">
            <label>البنك</label>
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
              <p class="field-error">{{ editBankErrors.bankName }}</p>
            }
          </div>
          <div class="field">
            <label>اسم المستفيد</label>
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
              <p class="field-error">{{ editBankErrors.accountName }}</p>
            }
          </div>
          <div class="field full">
            <label>الآيبان</label>
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
              <p class="field-error">{{ editBankErrors.iban }}</p>
            }
          </div>
        </div>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveBank(item)">حفظ</button>
          <button class="btn ghost" type="button" (click)="toggleBank(item)">
            {{ item.isActive ? 'إيقاف' : 'تفعيل' }}
          </button>
        </div>
      }
    </app-ops-drawer>
    <app-ops-modal [open]="addingBank" title="إضافة حساب بنكي" kicker="تحويل الاشتراك" (closed)="closeAddBank()">
      <div class="form-grid">
        <div class="field">
          <label>البنك</label>
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
            <p class="field-error">{{ bankDraftErrors.bankName }}</p>
          }
        </div>
        <div class="field">
          <label>اسم المستفيد</label>
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
            <p class="field-error">{{ bankDraftErrors.accountName }}</p>
          }
        </div>
        <div class="field full">
          <label>الآيبان</label>
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
            <p class="field-error">{{ bankDraftErrors.iban }}</p>
          }
        </div>
      </div>
      <button class="btn primary" style="margin-top:8px;width:100%" type="button" (click)="createBank()">إضافة الحساب</button>
    </app-ops-modal>
  `,
})
export class OpsSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

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
    this.shell.set('الإعدادات والرسائل', 'نصوص الترحيب وإعدادات التشغيل');
    this.load();
  }

  audienceLabel(value: string): string {
    if (value === 'CUSTOMER') {
      return 'العميلة';
    }
    if (value === 'PROVIDER') {
      return 'الخبيرة';
    }
    return 'الكل';
  }

  kindLabel(value: string): string {
    return value === 'MOTIVATIONAL' ? 'تحفيز' : 'ترحيب';
  }

  displayValue(item: (typeof SETTING_META)[number]): string {
    if (item.kind === 'idle') {
      return `${this.idleAfter[item.key] ?? 90} ${unitLabel(this.idleUnit[item.key] ?? 'day')}`;
    }
    return this.clip(this.values[item.key]);
  }

  saveSetting(item: (typeof SETTING_META)[number]): void {
    let value = this.values[item.key] ?? '';
    if (item.kind === 'idle') {
      const amount = Number(this.idleAfter[item.key]);
      if (!Number.isFinite(amount) || amount < 1) {
        this.toast.show('أدخلي مدة أكبر من صفر');
        return;
      }
      const unit = this.idleUnit[item.key] ?? 'day';
      value = `${Math.floor(amount)} ${unit}`;
      this.values[item.key] = value;
    } else if (item.kind === 'number') {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 1) {
        this.toast.show('أدخلي رقمًا أكبر من صفر');
        return;
      }
      value = String(Math.floor(amount));
      this.values[item.key] = value;
    }
    this.api.opsPatchSetting(item.key, value).subscribe({
      next: () => this.toast.show('تم حفظ الإعداد'),
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الإعداد')),
    });
  }

  saveWelcome(item: OpsWelcome): void {
    const bodyAr = item.bodyAr.trim();
    if (bodyAr.length < 4) {
      this.toast.show('أدخلي نص الرسالة');
      return;
    }
    this.api.opsPatchWelcome(item.id, { bodyAr }).subscribe({
      next: (row) => {
        item.bodyAr = row.bodyAr;
        this.toast.show('تم حفظ الرسالة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الرسالة')),
    });
  }

  toggleWelcome(item: OpsWelcome): void {
    this.api.opsPatchWelcome(item.id, { isActive: !item.isActive }).subscribe({
      next: (row) => {
        item.isActive = row.isActive;
        this.toast.show(row.isActive ? 'تم إظهار الرسالة' : 'تم إخفاء الرسالة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الرسالة')),
    });
  }

  createWelcome(): void {
    if (this.welcomeDraft.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي نص الرسالة');
      return;
    }
    this.api.opsCreateWelcome(this.welcomeDraft).subscribe({
      next: () => {
        this.toast.show('تمت إضافة الرسالة');
        this.welcomeDraft = { audience: 'CUSTOMER', kind: 'WELCOME', bodyAr: '' };
        this.addingWelcome = false;
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الرسالة')),
    });
  }

  selectBank(item: OpsBankAccount): void {
    this.selectedBank = item;
    this.editBankErrors = emptyBankErrors();
  }

  openAddBank(): void {
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
    item.bankName = lettersOnly(item.bankName).trim();
    item.iban = ibanOnly(item.iban);
    item.accountName = lettersOnly(item.accountName).trim();
    this.editBankErrors = {
      bankName: bankNameError(item.bankName),
      iban: ibanError(item.iban),
      accountName: accountNameError(item.accountName),
    };
    if (this.editBankErrors.bankName || this.editBankErrors.iban || this.editBankErrors.accountName) {
      this.toast.show('أدخلي اسم البنك والآيبان والمستفيد بالصيغة الصحيحة');
      return;
    }
    this.api.opsPatchBank(item.id, {
      bankName: item.bankName,
      iban: item.iban,
      accountName: item.accountName,
    }).subscribe({
      next: () => this.toast.show('تم حفظ الحساب البنكي'),
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الحساب البنكي')),
    });
  }

  toggleBank(item: OpsBankAccount): void {
    this.api.opsPatchBank(item.id, { isActive: !item.isActive }).subscribe({
      next: (row) => {
        item.isActive = row.isActive;
        this.toast.show(row.isActive ? 'الحساب ظاهر للخبيرات' : 'تم إيقاف الحساب');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الحساب البنكي')),
    });
  }

  createBank(): void {
    this.bankDraft.bankName = lettersOnly(this.bankDraft.bankName).trim();
    this.bankDraft.iban = ibanOnly(this.bankDraft.iban);
    this.bankDraft.accountName = lettersOnly(this.bankDraft.accountName).trim();
    this.bankDraftErrors = {
      bankName: bankNameError(this.bankDraft.bankName),
      iban: ibanError(this.bankDraft.iban),
      accountName: accountNameError(this.bankDraft.accountName),
    };
    if (this.bankDraftErrors.bankName || this.bankDraftErrors.iban || this.bankDraftErrors.accountName) {
      this.toast.show('أدخلي اسم البنك والآيبان والمستفيد بالصيغة الصحيحة');
      return;
    }
    this.api.opsCreateBank(this.bankDraft).subscribe({
      next: () => {
        this.toast.show('تمت إضافة الحساب البنكي');
        this.closeAddBank();
        this.loadBanks();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الحساب البنكي')),
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
        this.toast.show(apiMessage(err, 'تعذر تحميل الإعدادات'));
      },
    });
    this.api.opsWelcome().subscribe({
      next: (rows) => {
        this.welcome = rows;
        this.selectedWelcome = keepSelected(this.welcome, this.selectedWelcome);
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحميل الرسائل')),
    });
    this.loadBanks();
  }

  private loadBanks(): void {
    this.api.opsBankAccounts().subscribe({
      next: (rows) => {
        this.banks = rows;
        this.selectedBank = keepSelected(this.banks, this.selectedBank);
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحميل الحساب البنكي')),
    });
  }
}
