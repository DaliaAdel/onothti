import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import { type CatalogPackage, type CatalogService, type OpsCampaign } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { keepSelected } from './ops-ui';

@Component({
  selector: 'app-ops-packages',
  imports: [FormsModule, OpsDrawerComponent, OpsModalComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>الباقات</h2>
        <p>اضغطي على صف الباقة لفتح شاشتها وتعديل الأسعار والخدمات</p>
      </div>
      <button class="btn primary" type="button" (click)="adding = true">+ إضافة باقة</button>
    </div>
    <app-ops-modal [open]="adding" title="إضافة باقة" kicker="اشتراك الخبيرة" (closed)="adding = false">
      <div class="form-grid">
        <div class="field">
          <label>الكود</label>
          <input class="input" [(ngModel)]="draft.code" placeholder="GREEN" />
        </div>
        <div class="field">
          <label>الاسم</label>
          <input class="input" [(ngModel)]="draft.nameAr" />
        </div>
        <div class="field">
          <label>المدة بالشهور</label>
          <input class="input" type="number" [(ngModel)]="draft.durationMonths" />
        </div>
        <div class="field">
          <label>السعر قبل الخصم</label>
          <input class="input" type="number" min="0" step="0.01" [(ngModel)]="draft.priceBefore" />
        </div>
        <div class="field">
          <label>الخصم %</label>
          <input class="input" type="number" min="0" max="100" step="0.01" [(ngModel)]="draft.discountPercent" />
        </div>
        <div class="field">
          <label>السعر بعد الخصم</label>
          <input class="input" [value]="afterOf(draft.priceBefore, draft.discountPercent)" readonly />
        </div>
          <div class="field">
            <label>الترتيب</label>
            <input class="input" type="number" [(ngModel)]="draft.rank" />
          </div>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="create()">إضافة الباقة</button>
    </app-ops-modal>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الباقة</th>
              <th>الرمز</th>
              <th>المدة</th>
              <th>السعر</th>
              <th>الترتيب</th>
              <th>خدمات</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            @for (item of packages; track item.id) {
              <tr (click)="openPackage(item)">
                <td><b>{{ item.nameAr }}</b></td>
                <td>{{ item.code }}</td>
                <td>{{ item.durationMonths }} شهر</td>
                <td>
                  @if (hasDiscount(item)) {
                    <del>{{ money(item.priceBefore) }} ر.س</del>
                    <b> {{ money(item.price) }} ر.س</b>
                    <span class="badge">{{ money(item.discountPercent) }}%</span>
                  } @else {
                    {{ money(item.price) }} ر.س
                  }
                </td>
                <td>{{ item.rank }}</td>
                <td class="pkg-tags-cell">
                  <div class="pkg-tags">
                    @for (name of previewServiceNames(item); track name) {
                      <span class="pkg-tag">{{ name }}</span>
                    }
                    @if (extraServiceCount(item); as extra) {
                      <span class="pkg-tag more">+{{ extra }}</span>
                    }
                    @if (!previewServiceNames(item).length) {
                      <span class="pkg-tag more">بدون خدمات</span>
                    }
                  </div>
                </td>
                <td><span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? 'مفعّلة' : 'متوقفة' }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="section-head">
      <div>
        <h2>الحملات الترويجية</h2>
        <p>اربطي الحملة بباقة (مثل المجانية) ثم حددي المدة والتشغيل</p>
      </div>
      <button class="btn primary" type="button" (click)="openCampaignAdd()">+ إضافة حملة</button>
    </div>
    <app-ops-modal [open]="addingCampaign" title="إضافة حملة" kicker="ترويج الباقة" (closed)="addingCampaign = false">
      <div class="form-grid">
        <div class="field">
          <label>اسم الحملة</label>
          <input class="input" [(ngModel)]="campaignDraft.nameAr" />
        </div>
        <div class="field">
          <label>الباقة</label>
          <select class="input" [(ngModel)]="campaignDraft.packageId">
            <option value="">اختاري الباقة</option>
            @for (pkg of packages; track pkg.id) {
              <option [value]="pkg.id">{{ pkg.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>البداية</label>
          <input class="input" type="date" [(ngModel)]="campaignDraft.startDate" />
        </div>
        <div class="field">
          <label>النهاية</label>
          <input class="input" type="date" [(ngModel)]="campaignDraft.endDate" />
        </div>
        <div class="field">
          <label>مدة التنشيط بالأيام</label>
          <input class="input" type="number" min="1" [(ngModel)]="campaignDraft.benefitDays" />
        </div>
        <label class="ops-check" [class.on]="campaignDraft.clipToEndDate">
          <input type="checkbox" name="draftClipToEndDate" [(ngModel)]="campaignDraft.clipToEndDate" />
          <span class="ops-check-copy">
            <b>مرتبط بتاريخ نهاية الحملة</b>
            <small>لو الخبيرة فعّلت في نص المدة، تاخد الأيام المتبقية حتى تاريخ النهاية فقط.</small>
          </span>
        </label>

      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createCampaign()">إضافة الحملة</button>
    </app-ops-modal>
    <div class="ops-table-wrap">
      <table class="ops-table">
        <thead>
          <tr>
            <th>الحملة</th>
            <th>الباقة</th>
            <th>البداية</th>
            <th>النهاية</th>
            <th>مدة التنشيط</th>
            <th>حتى النهاية</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          @for (item of campaigns; track item.id) {
            <tr [class.active]="selectedCampaign?.id === item.id" (click)="selectedCampaign = item">
              <td><b>{{ item.nameAr }}</b></td>
              <td>{{ item.package?.nameAr || packageName(item.packageId) }}</td>
              <td>{{ toDate(item.startDate) }}</td>
              <td>{{ toDate(item.endDate) }}</td>
              <td>{{ item.benefitDays }} يوم</td>
              <td>{{ item.clipToEndDate ? 'نعم' : 'لا' }}</td>
              <td><span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? 'شغالة' : 'متوقفة' }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <app-ops-drawer
      [open]="!!selectedCampaign"
      [title]="selectedCampaign?.nameAr || ''"
      kicker="حملة ترويجية"
      (closed)="selectedCampaign = null"
    >
      @if (selectedCampaign; as item) {
        <p class="muted small">{{ toDate(item.startDate) }} → {{ toDate(item.endDate) }}</p>
        <div class="form-grid">
          <div class="field">
            <label>الباقة</label>
            <select class="input" [(ngModel)]="item.packageId">
              @for (pkg of packages; track pkg.id) {
                <option [value]="pkg.id">{{ pkg.nameAr }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>البداية</label>
            <input class="input" type="date" [(ngModel)]="campaignDates[item.id].startDate" />
          </div>
          <div class="field">
            <label>النهاية</label>
            <input class="input" type="date" [(ngModel)]="campaignDates[item.id].endDate" />
          </div>
          <label class="ops-check" [class.on]="item.clipToEndDate">
            <input type="checkbox" name="clipToEndDate" [(ngModel)]="item.clipToEndDate" />
            <span class="ops-check-copy">
              <b>مرتبط بتاريخ نهاية الحملة</b>
              <small>لو الخبيرة فعّلت في نص المدة، تاخد الأيام المتبقية حتى تاريخ النهاية فقط.</small>
            </span>
          </label>
          <div class="field">
            <label>مدة التنشيط بالأيام</label>
            <input class="input" type="number" [(ngModel)]="item.benefitDays" />
          </div>
        </div>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveCampaign(item)">حفظ</button>
          <button class="btn ghost" type="button" (click)="toggleCampaign(item)">
            {{ item.isActive ? 'اخفاء الحملة' : 'اظهار الحملة' }}
          </button>
        </div>
      }
    </app-ops-drawer>

    <div class="section-head">
      <div>
        <h2>مصفوفة انتقال حالات الحساب</h2>
        <p>مرجع سريع للحالات والمسؤول عن كل انتقال.</p>
      </div>
    </div>
    <div class="ops-table-wrap">
      <table class="ops-table">
        <thead>
          <tr>
            <th>من</th>
            <th>إلى</th>
            <th>سبب الانتقال</th>
            <th>المسؤول</th>
          </tr>
        </thead>
        <tbody>
          @for (row of stateMatrix; track row.from + row.to) {
            <tr>
              <td>{{ row.from }}</td>
              <td>{{ row.to }}</td>
              <td>{{ row.reason }}</td>
              <td>{{ row.owner }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class OpsPackagesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  packages: CatalogPackage[] = [];
  catalogServices: CatalogService[] = [];
  campaigns: OpsCampaign[] = [];
  selectedCampaign: OpsCampaign | null = null;
  campaignDates: Record<string, { startDate: string; endDate: string }> = {};
  loading = true;
  draft = { code: '', nameAr: '', durationMonths: 1, priceBefore: 0, discountPercent: 0, rank: 5 };
  adding = false;
  addingCampaign = false;
  campaignDraft = { nameAr: '', packageId: '', startDate: '', endDate: '', benefitDays: 30, clipToEndDate: true };
  readonly stateMatrix = [
    { from: 'قيد الإنشاء', to: 'غير نشط', reason: 'إنشاء الحساب وانتظار رمز التفعيل', owner: 'صاحبة الحساب والنظام' },
    { from: 'غير نشط', to: 'نشط', reason: 'نجاح إدخال رمز التحقق', owner: 'النظام' },
    { from: 'نشط وملفه قيد المراجعة', to: 'نشط وملفه معتمد', reason: 'اعتماد بيانات الملف والصور', owner: 'التشغيل' },
    { from: 'خبيرة نشطة', to: 'مقيد (خامل)', reason: 'انتهاء الباقة دون تجديد', owner: 'النظام' },
    { from: 'مقيد (خامل)', to: 'نشط وباقته سارية', reason: 'اعتماد التجديد أو الترقية', owner: 'التشغيل والمالية' },
    { from: 'أي حساب', to: 'موقوف', reason: 'مخالفة مثبتة', owner: 'صاحب الصلاحية' },
    { from: 'موقوف', to: 'نشط أو مقيد', reason: 'إزالة سبب الإيقاف', owner: 'صاحب الصلاحية' },
    { from: 'نشط', to: 'مقيد الصلاحيات', reason: 'مخالفة دون انتهاء الاشتراك', owner: 'التشغيل أو الإدارة' },
  ];

  ngOnInit(): void {
    this.shell.set('الباقات والحملات', 'إدارة الاشتراكات والحملة المجانية');
    this.load();
  }

  openPackage(item: CatalogPackage): void {
    void this.router.navigate(['/ops/packages', item.id]);
  }

  create(): void {
    if (!this.draft.code || !this.draft.nameAr) {
      this.toast.show('أدخلي الرمز والاسم');
      return;
    }
    this.api
      .opsCreatePackage({
        code: this.draft.code,
        nameAr: this.draft.nameAr,
        durationMonths: Number(this.draft.durationMonths),
        priceBefore: Number(this.draft.priceBefore),
        discountPercent: Number(this.draft.discountPercent),
        rank: Number(this.draft.rank),
      })
      .subscribe({
        next: (row) => {
          this.toast.show('تمت إضافة الباقة. حددي خدماتها');
          this.draft = { code: '', nameAr: '', durationMonths: 1, priceBefore: 0, discountPercent: 0, rank: 5 };
          this.adding = false;
          void this.router.navigate(['/ops/packages', row.id]);
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الباقة')),
      });
  }

  saveCampaign(item: OpsCampaign): void {
    const dates = this.campaignDates[item.id];
    this.api
      .opsPatchCampaign(item.id, {
        packageId: item.packageId,
        startDate: dates?.startDate,
        endDate: dates?.endDate,
        benefitDays: Number(item.benefitDays),
        clipToEndDate: Boolean(item.clipToEndDate),
      })
      .subscribe({
        next: (row) => {
          Object.assign(item, row);
          this.toast.show('تم حفظ الحملة');
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الحملة')),
      });
  }

  toggleCampaign(item: OpsCampaign): void {
    this.api.opsPatchCampaign(item.id, { isActive: !item.isActive }).subscribe({
      next: (row) => {
        item.isActive = row.isActive;
        this.toast.show(row.isActive ? 'الحملة شغالة' : 'تم إيقاف الحملة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الحملة')),
    });
  }

  toDate(value: string): string {
    return value.slice(0, 10);
  }

  money(value: number | string | null | undefined): number {
    const next = Number(value ?? 0);
    return Number.isFinite(next) ? next : 0;
  }

  afterOf(priceBefore: number | string | null | undefined, discountPercent: number | string | null | undefined): number {
    const before = Math.max(0, this.money(priceBefore));
    const percent = Math.min(100, Math.max(0, this.money(discountPercent)));
    return Math.round((before * (1 - percent / 100) + Number.EPSILON) * 100) / 100;
  }

  hasDiscount(item: CatalogPackage): boolean {
    return this.money(item.discountPercent) > 0;
  }

  packageName(id: string | undefined): string {
    return this.packages.find((item) => item.id === id)?.nameAr || '—';
  }

  openCampaignAdd(): void {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    this.campaignDraft = {
      nameAr: '',
      packageId: this.packages.find((item) => item.code === 'FREE')?.id || this.packages[0]?.id || '',
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
      benefitDays: 30,
      clipToEndDate: true,
    };
    this.addingCampaign = true;
  }

  createCampaign(): void {
    if (!this.campaignDraft.nameAr.trim() || !this.campaignDraft.packageId) {
      this.toast.show('أدخلي اسم الحملة واختاري الباقة');
      return;
    }
    this.api
      .opsCreateCampaign({
        nameAr: this.campaignDraft.nameAr.trim(),
        packageId: this.campaignDraft.packageId,
        startDate: this.campaignDraft.startDate,
        endDate: this.campaignDraft.endDate,
        benefitDays: Number(this.campaignDraft.benefitDays),
        clipToEndDate: Boolean(this.campaignDraft.clipToEndDate),
      })
      .subscribe({
        next: () => {
          this.toast.show('تمت إضافة الحملة');
          this.addingCampaign = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الحملة')),
      });
  }

  previewServiceNames(item: CatalogPackage): string[] {
    return this.namedServices(item).slice(0, 3);
  }

  extraServiceCount(item: CatalogPackage): number {
    return Math.max(0, this.namedServices(item).length - 3);
  }

  private namedServices(item: CatalogPackage): string[] {
    const ids = new Set(item.serviceIds ?? []);
    const names = this.catalogServices.filter((service) => ids.has(service.id)).map((service) => service.nameAr);
    if (names.length) {
      return names;
    }
    return ids.size ? [`${ids.size} خدمة`] : [];
  }

  private load(): void {
    this.loading = true;
    this.api.services().subscribe({
      next: (services) => {
        this.catalogServices = services;
      },
    });
    this.api.opsPackages().subscribe({
      next: (packages) => {
        this.packages = packages;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الباقات'));
      },
    });
    this.api.opsCampaigns().subscribe({
      next: (campaigns) => {
        this.campaigns = campaigns.map((item) => ({ ...item, clipToEndDate: Boolean(item.clipToEndDate) }));
        this.selectedCampaign = keepSelected(this.campaigns, this.selectedCampaign);
        for (const item of campaigns) {
          this.campaignDates[item.id] = {
            startDate: item.startDate.slice(0, 10),
            endDate: item.endDate.slice(0, 10),
          };
        }
      },
    });
  }
}
