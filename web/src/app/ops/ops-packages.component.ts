import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { CatalogPackage, OpsCampaign } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-ops-packages',
  imports: [FormsModule],
  template: `
    <div class="section-head">
      <div>
        <h2>الباقات</h2>
        <p>تعديل الأسعار والمدد وحدود الخدمات والصور والفيديو</p>
      </div>
    </div>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else {
      <div class="grid two">
        @for (item of packages; track item.id) {
          <article class="card">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <h3 style="margin:0;color:var(--plum)">{{ item.nameAr }} · {{ item.code }}</h3>
              <span class="badge" [style.opacity]="item.isActive ? '1' : '.45'">
                {{ item.isActive ? 'مفعّلة' : 'متوقفة' }}
              </span>
            </div>
            <div class="form-grid" style="margin-top:14px">
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
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
              <button class="btn primary" type="button" (click)="save(item)">حفظ</button>
              <button class="btn ghost" type="button" (click)="toggle(item)">
                {{ item.isActive ? 'إيقاف الظهور' : 'تفعيل الباقة' }}
              </button>
            </div>
          </article>
        }
      </div>

      <article class="card form-card" style="margin-top:22px">
        <h3 style="margin:0 0 12px;color:var(--plum)">إضافة باقة</h3>
        <div class="form-grid">
          <div class="field">
            <label>الرمز</label>
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
        <button class="btn primary" style="margin-top:14px" type="button" (click)="create()">إضافة</button>
      </article>
    }

    <div class="section-head">
      <div>
        <h2>الحملات المجانية</h2>
        <p>تشغيل وإيقاف نافذة الباقة المجانية بدون إصدار جديد</p>
      </div>
    </div>
    <div class="grid two">
      @for (item of campaigns; track item.id) {
        <article class="card">
          <h3 style="margin:0 0 8px;color:var(--plum)">{{ item.nameAr }}</h3>
          <p class="muted small">{{ toDate(item.startDate) }} → {{ toDate(item.endDate) }} · {{ item.benefitDays }} يوم استفادة</p>
          <div class="form-grid" style="margin-top:12px">
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
          <div style="display:flex;gap:8px;margin-top:14px">
            <button class="btn primary" type="button" (click)="saveCampaign(item)">حفظ</button>
            <button class="btn ghost" type="button" (click)="toggleCampaign(item)">
              {{ item.isActive ? 'إيقاف الحملة' : 'تشغيل الحملة' }}
            </button>
          </div>
        </article>
      }
    </div>
  `,
})
export class OpsPackagesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  packages: CatalogPackage[] = [];
  campaigns: OpsCampaign[] = [];
  campaignDates: Record<string, { startDate: string; endDate: string }> = {};
  loading = true;
  draft = { code: '', nameAr: '', durationMonths: 1, price: 0, rank: 5 };

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
