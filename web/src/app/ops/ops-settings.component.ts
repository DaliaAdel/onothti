import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsBankAccount, OpsManagedAccount, OpsWelcome } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { clip, keepSelected } from './ops-ui';

const SETTING_META: { key: string; label: string; hint: string }[] = [
  { key: 'whatsapp_disclaimer', label: 'تنبيه واتساب', hint: 'يظهر عند التواصل خارج المنصة' },
  { key: 'whatsapp_disclaimer_en', label: 'تنبيه واتساب بالإنجليزي', hint: 'النص الإنجليزي لنفس التنبيه' },
  { key: 'otp_ttl_seconds', label: 'مدة رمز التحقق (ثوانٍ)', hint: 'الرمز ينتهي بعد هذا العدد' },
  { key: 'rating_note_max', label: 'حد حروف ملاحظة التقييم', hint: 'الحد الأقصى لتعليق التقييم' },
  { key: 'package_extension_months', label: 'أشهر تمديد الباقة', hint: 'عند تأكيد إيصال التجديد' },
  { key: 'idle_after_days', label: 'أيام الخمول', hint: 'بعدها يعتبر الحساب غير نشط في الظهور' },
  { key: 'terms_version', label: 'نسخة الشروط', hint: 'ارفع الرقم عند تحديث الشروط' },
];

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
                <td class="clip">{{ clip(values[item.key]) }}</td>
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
        <textarea class="input" rows="4" [(ngModel)]="values[item.key]"></textarea>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveSetting(item.key)">حفظ</button>
        </div>
      }
    </app-ops-drawer>

    <div class="section-head">
      <div>
        <h2>رسائل الترحيب</h2>
        <p>ترحيب وتحفيز للعميلة والخبيرة عند الدخول</p>
      </div>
      <button class="btn primary" type="button" (click)="addingWelcome = true">+ إضافة رسالة</button>
    </div>
    <div class="ops-table-wrap" style="margin-bottom:18px">
      <table class="ops-table">
        <thead>
          <tr>
            <th>الجمهور</th>
            <th>النوع</th>
            <th>النص</th>
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
        <textarea class="input" rows="5" [(ngModel)]="item.bodyAr"></textarea>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveWelcome(item)">حفظ</button>
          <button class="btn ghost" type="button" (click)="toggleWelcome(item)">
            {{ item.isActive ? 'إيقاف' : 'تشغيل' }}
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
        <p>بيانات التحويل التي تراها الخبيرة عند الاشتراك.</p>
      </div>
      <button class="btn primary" type="button" (click)="addingBank = true">+ إضافة حساب</button>
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
            <tr [class.active]="selectedBank?.id === item.id" (click)="selectedBank = item">
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
            <input class="input" [(ngModel)]="item.bankName" />
          </div>
          <div class="field">
            <label>الآيبان</label>
            <input class="input" dir="ltr" [(ngModel)]="item.iban" />
          </div>
          <div class="field">
            <label>اسم المستفيد</label>
            <input class="input" [(ngModel)]="item.accountName" />
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
    <app-ops-modal [open]="addingBank" title="إضافة حساب بنكي" kicker="تحويل الاشتراك" (closed)="addingBank = false">
      <div class="form-grid">
        <div class="field">
          <label>البنك</label>
          <input class="input" [(ngModel)]="bankDraft.bankName" />
        </div>
        <div class="field">
          <label>الآيبان</label>
          <input class="input" dir="ltr" [(ngModel)]="bankDraft.iban" />
        </div>
        <div class="field">
          <label>اسم المستفيد</label>
          <input class="input" [(ngModel)]="bankDraft.accountName" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createBank()">إضافة الحساب</button>
    </app-ops-modal>

    <div class="section-head">
      <div>
        <h2>إشعار جماعي</h2>
        <p>يصل إلى حسابات العميلات أو الخبيرات النشطة.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" type="button" (click)="openDirect()">+ إشعار لحساب</button>
        <button class="btn primary" type="button" (click)="addingBroadcast = true">+ إرسال جماعي</button>
      </div>
    </div>
    <app-ops-modal [open]="addingDirect" title="إشعار لحساب واحد" kicker="بحث بالجوال أو الرمز" (closed)="addingDirect = false">
      <div class="field">
        <label>بحث</label>
        <input class="input" [(ngModel)]="directQ" placeholder="الاسم أو الجوال أو الرمز" (keyup.enter)="searchDirect()" />
      </div>
      <button class="btn ghost" style="margin:10px 0 14px" type="button" (click)="searchDirect()">بحث</button>
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
        <p class="muted small">المحددة: {{ directTarget.displayName }} · <span dir="ltr">{{ directTarget.mobile }}</span></p>
      }
      <div class="form-grid">
        <div class="field">
          <label>العنوان</label>
          <input class="input" [(ngModel)]="direct.titleAr" />
        </div>
        <div class="field full">
          <label>النص</label>
          <textarea class="input" rows="3" [(ngModel)]="direct.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="sendDirect()">إرسال الإشعار</button>
    </app-ops-modal>
    <app-ops-modal [open]="addingBroadcast" title="إشعار جماعي" kicker="إرسال للمنصة" (closed)="addingBroadcast = false">
      <div class="form-grid">
        <div class="field">
          <label>الجمهور</label>
          <select class="input" [(ngModel)]="broadcast.audience">
            <option value="CUSTOMER">العميلات</option>
            <option value="PROVIDER">الخبيرات</option>
            <option value="ALL">الكل</option>
          </select>
        </div>
        <div class="field">
          <label>العنوان</label>
          <input class="input" [(ngModel)]="broadcast.titleAr" />
        </div>
        <div class="field full">
          <label>النص</label>
          <textarea class="input" rows="3" [(ngModel)]="broadcast.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="sendBroadcast()">إرسال الإشعار</button>
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
  selectedSetting: (typeof SETTING_META)[number] | null = null;
  selectedWelcome: OpsWelcome | null = null;
  selectedBank: OpsBankAccount | null = null;
  welcome: OpsWelcome[] = [];
  welcomeDraft = { audience: 'CUSTOMER', kind: 'WELCOME', bodyAr: '' };
  banks: OpsBankAccount[] = [];
  bankDraft = { bankName: '', iban: '', accountName: '' };
  broadcast = { audience: 'CUSTOMER' as 'CUSTOMER' | 'PROVIDER' | 'ALL', titleAr: '', bodyAr: '' };
  addingWelcome = false;
  addingBank = false;
  addingBroadcast = false;
  addingDirect = false;
  directQ = '';
  directHits: OpsManagedAccount[] = [];
  directTarget: OpsManagedAccount | null = null;
  direct = { titleAr: '', bodyAr: '' };
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

  saveSetting(key: string): void {
    this.api.opsPatchSetting(key, this.values[key] ?? '').subscribe({
      next: () => this.toast.show('تم حفظ الإعداد'),
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الإعداد')),
    });
  }

  saveWelcome(item: OpsWelcome): void {
    this.api.opsPatchWelcome(item.id, item).subscribe({
      next: () => this.toast.show('تم حفظ الرسالة'),
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الرسالة')),
    });
  }

  toggleWelcome(item: OpsWelcome): void {
    this.api.opsPatchWelcome(item.id, { ...item, isActive: !item.isActive }).subscribe({
      next: (row) => {
        item.isActive = row.isActive;
        this.toast.show(row.isActive ? 'الرسالة ظاهرة' : 'تم إيقاف الرسالة');
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

  saveBank(item: OpsBankAccount): void {
    this.api.opsPatchBank(item.id, item).subscribe({
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
    if (this.bankDraft.bankName.trim().length < 2 || this.bankDraft.iban.trim().length < 10 || this.bankDraft.accountName.trim().length < 2) {
      this.toast.show('أدخلي اسم البنك والآيبان والمستفيد');
      return;
    }
    this.api.opsCreateBank(this.bankDraft).subscribe({
      next: () => {
        this.toast.show('تمت إضافة الحساب البنكي');
        this.bankDraft = { bankName: '', iban: '', accountName: '' };
        this.addingBank = false;
        this.loadBanks();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الحساب البنكي')),
    });
  }

  openDirect(): void {
    this.addingDirect = true;
    this.directQ = '';
    this.directHits = [];
    this.directTarget = null;
    this.direct = { titleAr: '', bodyAr: '' };
  }

  searchDirect(): void {
    const q = this.directQ.trim();
    if (q.length < 2) {
      this.toast.show('أدخلي الاسم أو الجوال أو الرمز');
      return;
    }
    this.api.opsAccounts({ q }).subscribe({
      next: (rows) => {
        this.directHits = rows.slice(0, 8);
        this.directTarget = this.directHits.length === 1 ? this.directHits[0] : null;
        if (!this.directHits.length) {
          this.toast.show('لا يوجد حساب مطابق');
        }
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر البحث عن الحساب')),
    });
  }

  sendDirect(): void {
    if (!this.directTarget) {
      this.toast.show('اختاري الحساب بعد البحث');
      return;
    }
    if (this.direct.titleAr.trim().length < 2 || this.direct.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي عنوان الإشعار ونصه');
      return;
    }
    this.api.opsNotifyAccount(this.directTarget.id, this.direct).subscribe({
      next: () => {
        this.toast.show(`تم إرسال الإشعار إلى ${this.directTarget?.displayName}`);
        this.addingDirect = false;
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الإشعار')),
    });
  }

  sendBroadcast(): void {
    if (this.broadcast.titleAr.trim().length < 2 || this.broadcast.bodyAr.trim().length < 4) {
      this.toast.show('أدخلي عنوان الإشعار ونصه');
      return;
    }
    this.api.opsBroadcast(this.broadcast).subscribe({
      next: (res) => {
        this.toast.show(`تم إرسال الإشعار إلى ${res.sent} حسابًا`);
        this.broadcast = { audience: this.broadcast.audience, titleAr: '', bodyAr: '' };
        this.addingBroadcast = false;
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الإشعار')),
    });
  }

  private load(): void {
    this.loading = true;
    this.api.opsSettings().subscribe({
      next: (rows) => {
        const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
        for (const item of SETTING_META) {
          this.values[item.key] = map[item.key] ?? '';
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
