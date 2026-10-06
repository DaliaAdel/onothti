import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsBankAccount, OpsWelcome } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

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
  imports: [FormsModule],
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
      <div class="grid two">
        @for (item of settingRows; track item.key) {
          <article class="card">
            <h3 style="margin:0 0 6px;color:var(--plum)">{{ item.label }}</h3>
            <p class="muted small">{{ item.hint }}</p>
            <textarea class="input" rows="3" [(ngModel)]="values[item.key]"></textarea>
            <button class="btn primary" style="margin-top:12px" type="button" (click)="saveSetting(item.key)">حفظ</button>
          </article>
        }
      </div>
    }

    <div class="section-head">
      <div>
        <h2>رسائل الترحيب</h2>
        <p>ترحيب وتحفيز للعميلة والخبيرة عند الدخول</p>
      </div>
    </div>
    <div class="grid two">
      @for (item of welcome; track item.id) {
        <article class="card">
          <p style="margin:0 0 8px;font-weight:700;color:var(--plum)">
            {{ audienceLabel(item.audience) }} · {{ kindLabel(item.kind) }}
          </p>
          <textarea class="input" rows="4" [(ngModel)]="item.bodyAr"></textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
            <button class="btn primary" type="button" (click)="saveWelcome(item)">حفظ</button>
            <button class="btn ghost" type="button" (click)="toggleWelcome(item)">
              {{ item.isActive ? 'إيقاف' : 'تشغيل' }}
            </button>
          </div>
        </article>
      }
    </div>

    <article class="card form-card" style="margin-top:22px">
      <h3 style="margin:0 0 12px;color:var(--plum)">إضافة رسالة</h3>
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
      <button class="btn primary" style="margin-top:14px" type="button" (click)="createWelcome()">إضافة</button>
    </article>

    <div class="section-head">
      <div>
        <h2>الحساب البنكي للمنصة</h2>
        <p>بيانات التحويل التي تراها الخبيرة عند الاشتراك.</p>
      </div>
    </div>
    @for (item of banks; track item.id) {
      <article class="card" style="margin-bottom:14px">
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
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button class="btn primary" type="button" (click)="saveBank(item)">حفظ</button>
          <button class="btn ghost" type="button" (click)="toggleBank(item)">
            {{ item.isActive ? 'إيقاف' : 'تفعيل' }}
          </button>
        </div>
      </article>
    }
    <article class="card form-card" style="margin-bottom:22px">
      <h3 style="margin:0 0 12px;color:var(--plum)">إضافة حساب بنكي</h3>
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
      <button class="btn primary" style="margin-top:14px" type="button" (click)="createBank()">إضافة</button>
    </article>

    <div class="section-head">
      <div>
        <h2>إشعار جماعي</h2>
        <p>يصل إلى حسابات العميلات أو الخبيرات النشطة.</p>
      </div>
    </div>
    <article class="card form-card">
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
      <button class="btn primary" style="margin-top:14px" type="button" (click)="sendBroadcast()">إرسال الإشعار</button>
    </article>
  `,
})
export class OpsSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  loading = true;
  values: Record<string, string> = {};
  welcome: OpsWelcome[] = [];
  welcomeDraft = { audience: 'CUSTOMER', kind: 'WELCOME', bodyAr: '' };
  banks: OpsBankAccount[] = [];
  bankDraft = { bankName: '', iban: '', accountName: '' };
  broadcast = { audience: 'CUSTOMER' as 'CUSTOMER' | 'PROVIDER' | 'ALL', titleAr: '', bodyAr: '' };
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
        this.loadBanks();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الحساب البنكي')),
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
      next: (rows) => (this.welcome = rows),
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحميل الرسائل')),
    });
    this.loadBanks();
  }

  private loadBanks(): void {
    this.api.opsBankAccounts().subscribe({
      next: (rows) => (this.banks = rows),
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحميل الحساب البنكي')),
    });
  }
}
