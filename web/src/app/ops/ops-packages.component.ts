import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { CatalogPackage, OpsCampaign } from '../core/models';
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
        <p>اضغطي على صف الباقة لتعديل الأسعار والحدود</p>
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
          <label>السعر</label>
          <input class="input" type="number" [(ngModel)]="draft.price" />
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
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            @for (item of packages; track item.id) {
              <tr [class.active]="selectedPackage?.id === item.id" (click)="selectedPackage = item">
                <td><b>{{ item.nameAr }}</b></td>
                <td>{{ item.code }}</td>
                <td>{{ item.durationMonths }} شهر</td>
                <td>{{ item.price }} ر.س</td>
                <td>{{ item.rank }}</td>
                <td><span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? 'مفعّلة' : 'متوقفة' }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="section-head">
      <div>
        <h2>الحملات المجانية</h2>
        <p>اضغطي على الحملة لتعديل المدة وتشغيلها</p>
      </div>
    </div>
    <div class="ops-table-wrap">
      <table class="ops-table">
        <thead>
          <tr>
            <th>الحملة</th>
            <th>البداية</th>
            <th>النهاية</th>
            <th>أيام الاستفادة</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          @for (item of campaigns; track item.id) {
            <tr [class.active]="selectedCampaign?.id === item.id" (click)="selectedCampaign = item">
              <td><b>{{ item.nameAr }}</b></td>
              <td>{{ toDate(item.startDate) }}</td>
              <td>{{ toDate(item.endDate) }}</td>
              <td>{{ item.benefitDays }}</td>
              <td><span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? 'شغالة' : 'متوقفة' }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <app-ops-drawer
      [open]="!!selectedPackage"
      [title]="selectedPackage?.nameAr || ''"
      [kicker]="selectedPackage?.code || 'باقة'"
      (closed)="selectedPackage = null"
    >
      @if (selectedPackage; as item) {
        <div class="form-grid">
          <div class="field">
            <label>الاسم</label>
            <input class="input" [(ngModel)]="item.nameAr" />
          </div>
          <div class="field">
            <label>المدة بالشهور</label>
            <input class="input" type="number" [(ngModel)]="item.durationMonths" />
          </div>
          <div class="field">
            <label>السعر</label>
            <input class="input" type="number" [(ngModel)]="item.price" />
          </div>
          <div class="field">
            <label>ترتيب الظهور</label>
            <input class="input" type="number" [(ngModel)]="item.rank" />
          </div>
          <div class="field">
            <label>حد الخدمات</label>
            <input class="input" type="number" [(ngModel)]="item.maxServices" />
          </div>
          <div class="field">
            <label>حد الصور</label>
            <input class="input" type="number" [(ngModel)]="item.maxPhotos" />
          </div>
          <div class="field">
            <label>حد الفيديو</label>
            <input class="input" type="number" [(ngModel)]="item.maxVideos" />
          </div>
          <div class="field">
            <label>حد الألبومات</label>
            <input class="input" type="number" [(ngModel)]="item.maxAlbums" />
          </div>
        </div>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="save(item)">حفظ</button>
          <button class="btn ghost" type="button" (click)="toggle(item)">
            {{ item.isActive ? 'إيقاف الظهور' : 'تفعيل الباقة' }}
          </button>
        </div>
      }
    </app-ops-drawer>

    <app-ops-drawer
      [open]="!!selectedCampaign"
      [title]="selectedCampaign?.nameAr || ''"
      kicker="حملة مجانية"
      (closed)="selectedCampaign = null"
    >
      @if (selectedCampaign; as item) {
        <p class="muted small">{{ toDate(item.startDate) }} → {{ toDate(item.endDate) }}</p>
        <div class="form-grid">
          <div class="field">
            <label>البداية</label>
            <input class="input" type="date" [(ngModel)]="campaignDates[item.id].startDate" />
          </div>
          <div class="field">
            <label>النهاية</label>
            <input class="input" type="date" [(ngModel)]="campaignDates[item.id].endDate" />
          </div>
          <div class="field">
            <label>أيام الاستفادة</label>
            <input class="input" type="number" [(ngModel)]="item.benefitDays" />
          </div>
        </div>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveCampaign(item)">حفظ</button>
          <button class="btn ghost" type="button" (click)="toggleCampaign(item)">
            {{ item.isActive ? 'إيقاف الحملة' : 'تشغيل الحملة' }}
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
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  packages: CatalogPackage[] = [];
  campaigns: OpsCampaign[] = [];
  selectedPackage: CatalogPackage | null = null;
  selectedCampaign: OpsCampaign | null = null;
  campaignDates: Record<string, { startDate: string; endDate: string }> = {};
  loading = true;
  draft = { code: '', nameAr: '', durationMonths: 1, price: 0, rank: 5 };
  adding = false;
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

  save(item: CatalogPackage): void {
    this.api
      .opsPatchPackage(item.id, {
        nameAr: item.nameAr,
        durationMonths: Number(item.durationMonths),
        price: Number(item.price),
        rank: Number(item.rank),
        maxServices: this.numOrNull(item.maxServices),
        maxPhotos: this.numOrNull(item.maxPhotos),
        maxVideos: this.numOrNull(item.maxVideos),
        maxAlbums: this.numOrNull(item.maxAlbums),
      })
      .subscribe({
        next: () => this.toast.show('تم حفظ الباقة'),
        error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الباقة')),
      });
  }

  toggle(item: CatalogPackage): void {
    this.api.opsPatchPackage(item.id, { isActive: !item.isActive }).subscribe({
      next: (row) => {
        item.isActive = row.isActive;
        this.toast.show(row.isActive ? 'الباقة ظاهرة للخبيرات' : 'تم إيقاف الباقة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الحالة')),
    });
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
        price: Number(this.draft.price),
        rank: Number(this.draft.rank),
      })
      .subscribe({
        next: () => {
          this.toast.show('تمت إضافة الباقة');
          this.draft = { code: '', nameAr: '', durationMonths: 1, price: 0, rank: 5 };
          this.adding = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الباقة')),
      });
  }

  saveCampaign(item: OpsCampaign): void {
    const dates = this.campaignDates[item.id];
    this.api
      .opsPatchCampaign(item.id, {
        startDate: dates?.startDate,
        endDate: dates?.endDate,
        benefitDays: Number(item.benefitDays),
      })
      .subscribe({
        next: () => this.toast.show('تم حفظ الحملة'),
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

  private numOrNull(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  }

  private load(): void {
    this.loading = true;
    this.api.opsPackages().subscribe({
      next: (packages) => {
        this.packages = packages;
        this.selectedPackage = keepSelected(this.packages, this.selectedPackage);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الباقات'));
      },
    });
    this.api.opsCampaigns().subscribe({
      next: (campaigns) => {
        this.campaigns = campaigns;
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
