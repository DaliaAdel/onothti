import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import { type CatalogPackage, type CatalogService, type OpsCampaign } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsModalComponent } from './ops-modal.component';
import { PositiveIntDirective } from './positive-int.directive';

@Component({
  selector: 'app-ops-packages',
  imports: [FormsModule, NgTemplateOutlet, OpsModalComponent, PositiveIntDirective],
  template: `
    <ng-template #packageForm>
      <div class="form-grid">
        <div class="field">
          <label>الاسم</label>
          <input class="input" [(ngModel)]="draft.nameAr" />
        </div>
        <div class="field">
          <label>المدة بالشهور</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="draft.durationMonths" />
        </div>
        <div class="field">
          <label>السعر قبل الخصم</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="draft.priceBefore" />
        </div>
        <div class="field">
          <label>الخصم %</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="draft.discountPercent" />
        </div>
        <div class="field">
          <label>السعر بعد الخصم</label>
          <input class="input" [value]="afterOf(draft.priceBefore, draft.discountPercent)" readonly />
        </div>
        <div class="field">
          <label>الترتيب</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="draft.rank" />
        </div>
      </div>
    </ng-template>
    <div class="section-head">
      <div>
        <h2>الباقات</h2>
        <p>الباقات العادية للاشتراك. اضغطي على صف لتعديلها وتحديد خدماتها</p>
      </div>
      @if (canEditPackage) {
        <button class="btn primary" type="button" (click)="openAdd()">+ إضافة باقة</button>
      }
    </div>
    <app-ops-modal [open]="adding" title="إضافة باقة" kicker="اشتراك الخبيرة" (closed)="adding = false">
      <ng-container [ngTemplateOutlet]="packageForm" />
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="create()">إضافة الباقة</button>
    </app-ops-modal>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!regularPackages.length) {
      <p class="page-empty">لا توجد باقات عادية بعد.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الباقة</th>
              <th>المدة</th>
              <th>السعر</th>
              <th>الترتيب</th>
              <th>خدمات</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            @for (item of regularPackages; track item.id) {
              <tr (click)="openPackage(item)">
                <td><b>{{ item.nameAr }}</b></td>
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
        <h2>الباقات الترويجية</h2>
        <p>نفس بيانات الباقة العادية، بالإضافة إلى مدة الحملة وتاريخ البداية والنهاية</p>
      </div>
      @if (canAddPromo) {
        <button class="btn primary" type="button" (click)="openCampaignAdd()">+ إضافة باقة ترويجية</button>
      }
    </div>
    <app-ops-modal [open]="addingCampaign" title="إضافة باقة ترويجية" kicker="باقة + حملة" (closed)="addingCampaign = false">
      <ng-container [ngTemplateOutlet]="packageForm" />
      <div class="form-grid" style="margin-top:16px">
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
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="campaignDraft.benefitDays" />
        </div>
        <label class="ops-check" [class.on]="campaignDraft.clipToEndDate">
          <input type="checkbox" name="draftClipToEndDate" [(ngModel)]="campaignDraft.clipToEndDate" />
          <span class="ops-check-copy">
            <b>مرتبط بتاريخ نهاية الحملة</b>
            <small>لو الخبيرة فعّلت في نص المدة، تاخد الأيام المتبقية حتى تاريخ النهاية فقط.</small>
          </span>
        </label>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createPromo()">إضافة الباقة الترويجية</button>
    </app-ops-modal>
    @if (!promoPackages.length) {
      <p class="page-empty">لا توجد باقات ترويجية بعد.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الباقة</th>
              <th>المدة</th>
              <th>السعر</th>
              <th>البداية</th>
              <th>النهاية</th>
              <th>مدة التنشيط</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            @for (item of promoPackages; track item.id) {
              <tr (click)="openPackage(item)">
                <td><b>{{ item.nameAr }}</b></td>
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
                <td>{{ campaignDate(item, 'startDate') }}</td>
                <td>{{ campaignDate(item, 'endDate') }}</td>
                <td>{{ campaignDays(item) }}</td>
                <td>
                  <span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? 'مفعّلة' : 'متوقفة' }}</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

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
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  get canEditPackage(): boolean {
    return this.session.hasAnyPermission('PKG-04', 'PKG-05');
  }

  get canCampaign(): boolean {
    return this.session.hasAnyPermission('PKG-03');
  }

  get canAddPromo(): boolean {
    return this.canEditPackage && this.canCampaign;
  }

  get regularPackages(): CatalogPackage[] {
    return this.packages.filter((item) => !item.isPromotional);
  }

  get promoPackages(): CatalogPackage[] {
    return this.packages.filter((item) => item.isPromotional);
  }

  packages: CatalogPackage[] = [];
  catalogServices: CatalogService[] = [];
  campaigns: OpsCampaign[] = [];
  loading = true;
  draft = { nameAr: '', durationMonths: 1, priceBefore: '' as number | '', discountPercent: '' as number | '', rank: 5 };
  adding = false;
  addingCampaign = false;
  campaignDraft = { startDate: '', endDate: '', benefitDays: 30, clipToEndDate: true };
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

  campaignOf(item: CatalogPackage): OpsCampaign | undefined {
    return this.campaigns.find((row) => row.packageId === item.id);
  }

  campaignDate(item: CatalogPackage, field: 'startDate' | 'endDate'): string {
    const value = this.campaignOf(item)?.[field];
    return value ? this.toDate(value) : '—';
  }

  campaignDays(item: CatalogPackage): string {
    const days = this.campaignOf(item)?.benefitDays;
    return days ? `${days} يوم` : '—';
  }

  openAdd(): void {
    this.addingCampaign = false;
    this.draft = this.emptyDraft();
    this.adding = true;
  }

  create(): void {
    const fields = this.packageFields();
    if (!fields) {
      return;
    }
    this.api.opsCreatePackage(fields).subscribe({
      next: (row) => {
        this.toast.show('تمت إضافة الباقة. حددي خدماتها');
        this.draft = this.emptyDraft();
        this.adding = false;
        void this.router.navigate(['/ops/packages', row.id]);
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الباقة')),
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

  openCampaignAdd(): void {
    this.adding = false;
    this.draft = this.emptyDraft();
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    this.campaignDraft = {
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
      benefitDays: 30,
      clipToEndDate: true,
    };
    this.addingCampaign = true;
  }

  createPromo(): void {
    const fields = this.packageFields();
    if (!fields) {
      return;
    }
    const benefitDays = Number(this.campaignDraft.benefitDays);
    if (!benefitDays || benefitDays <= 0) {
      this.toast.show('مدة التنشيط رقم أكبر من صفر');
      return;
    }
    if (!this.campaignDraft.startDate || !this.campaignDraft.endDate) {
      this.toast.show('حددي بداية ونهاية الحملة');
      return;
    }
    if (this.campaignDraft.endDate < this.campaignDraft.startDate) {
      this.toast.show('تاريخ النهاية قبل البداية');
      return;
    }
    this.api.opsCreatePackage({ ...fields, isPromotional: true }).subscribe({
      next: (row) => {
        this.api
          .opsCreateCampaign({
            nameAr: row.nameAr,
            packageId: row.id,
            startDate: this.campaignDraft.startDate,
            endDate: this.campaignDraft.endDate,
            benefitDays,
            clipToEndDate: Boolean(this.campaignDraft.clipToEndDate),
            isActive: true,
          })
          .subscribe({
            next: () => {
              this.toast.show('تمت إضافة الباقة الترويجية. حددي خدماتها');
              this.finishPromo(row.id);
            },
            error: (err) => {
              this.toast.show(apiMessage(err, 'تمت إضافة الباقة وتعذر حفظ الحملة'));
              this.finishPromo(row.id);
            },
          });
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الباقة')),
    });
  }

  previewServiceNames(item: CatalogPackage): string[] {
    return this.namedServices(item).slice(0, 3);
  }

  extraServiceCount(item: CatalogPackage): number {
    return Math.max(0, this.namedServices(item).length - 3);
  }

  private emptyDraft() {
    return { nameAr: '', durationMonths: 1, priceBefore: '' as number | '', discountPercent: '' as number | '', rank: 5 };
  }

  private packageFields(): {
    nameAr: string;
    durationMonths: number;
    priceBefore: number;
    discountPercent: number;
    rank: number;
  } | null {
    if (!this.draft.nameAr.trim()) {
      this.toast.show('أدخلي اسم الباقة');
      return null;
    }
    const durationMonths = Number(this.draft.durationMonths);
    const priceBefore = Number(this.draft.priceBefore);
    const rank = Number(this.draft.rank);
    if (!durationMonths || durationMonths <= 0 || !priceBefore || priceBefore <= 0 || !rank || rank <= 0) {
      this.toast.show('المدة والسعر والترتيب أرقام أكبر من صفر');
      return null;
    }
    return {
      nameAr: this.draft.nameAr.trim(),
      durationMonths,
      priceBefore,
      discountPercent: Number(this.draft.discountPercent) || 0,
      rank,
    };
  }

  private finishPromo(packageId: string): void {
    this.draft = this.emptyDraft();
    this.addingCampaign = false;
    this.load();
    void this.router.navigate(['/ops/packages', packageId]);
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
      },
    });
  }
}
