import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsCity, OpsCoverage, OpsRegion } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-ops-geo',
  imports: [FormsModule],
  template: `
    <div class="section-head">
      <div>
        <h2>المناطق والمدن</h2>
        <p>أضيفي منطقة، ثم مدينة واحدة أو أكثر تابعة لها. الظهور للعميلة والخبيرة يعتمد على تفعيل المنطقة والمدينة معًا.</p>
      </div>
    </div>

    <article class="card form-card" style="margin-bottom:22px">
      <h3 style="margin:0 0 12px;color:var(--plum)">إضافة منطقة</h3>
      <div class="form-grid">
        <div class="field">
          <label>الرمز</label>
          <input class="input" [(ngModel)]="regionDraft.code" placeholder="EAST" />
        </div>
        <div class="field">
          <label>الاسم</label>
          <input class="input" [(ngModel)]="regionDraft.nameAr" placeholder="الشرقية" />
        </div>
        <div class="field">
          <label>الاسم الإنجليزي</label>
          <input class="input" [(ngModel)]="regionDraft.nameEn" placeholder="Eastern" />
        </div>
        <div class="field">
          <label>ترتيب الظهور</label>
          <input class="input" type="number" [(ngModel)]="regionDraft.sortOrder" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:14px" type="button" (click)="createRegion()">إضافة المنطقة</button>
    </article>

    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!regions.length) {
      <p class="page-empty">لا توجد مناطق بعد.</p>
    } @else {
      <div class="grid two">
        @for (region of regions; track region.id) {
          <article class="card">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <h3 style="margin:0;color:var(--plum)">{{ region.nameAr }} · {{ region.code }}</h3>
              <span class="badge" [style.opacity]="region.isVisible ? '1' : '.45'">
                {{ region.isVisible ? 'ظاهرة' : 'مخفية' }}
              </span>
            </div>
            <div class="form-grid" style="margin-top:14px">
              <div class="field">
                <label>الاسم</label>
                <input class="input" [(ngModel)]="region.nameAr" />
              </div>
              <div class="field">
                <label>الاسم الإنجليزي</label>
                <input class="input" [(ngModel)]="region.nameEn" />
              </div>
              <div class="field">
                <label>ترتيب الظهور</label>
                <input class="input" type="number" [(ngModel)]="region.sortOrder" />
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
              <button class="btn primary" type="button" (click)="saveRegion(region)">حفظ المنطقة</button>
              <button class="btn ghost" type="button" (click)="toggleRegion(region)">
                {{ region.isVisible ? 'إخفاء المنطقة' : 'إظهار المنطقة' }}
              </button>
            </div>

            <h4 style="margin:22px 0 8px;color:var(--plum)">مدن المنطقة ({{ region.cities.length }})</h4>
            @if (!region.cities.length) {
              <p class="muted small">لا توجد مدن. أضيفي مدينة واحدة أو أكثر لهذه المنطقة.</p>
            }
            @for (city of region.cities; track city.id) {
              <div style="border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px">
                  <b>{{ city.nameAr }} · {{ city.code }}</b>
                  <span class="badge" [style.opacity]="city.isVisible ? '1' : '.45'">
                    {{ city.isVisible ? 'ظاهرة' : 'مخفية' }}
                  </span>
                </div>
                <div class="form-grid">
                  <div class="field">
                    <label>الاسم</label>
                    <input class="input" [(ngModel)]="city.nameAr" />
                  </div>
                  <div class="field">
                    <label>الاسم الإنجليزي</label>
                    <input class="input" [(ngModel)]="city.nameEn" />
                  </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                  <button class="btn primary" type="button" (click)="saveCity(city)">حفظ</button>
                  <button class="btn ghost" type="button" (click)="toggleCity(city)">
                    {{ city.isVisible ? 'إخفاء' : 'إظهار' }}
                  </button>
                </div>
                <p class="muted small" style="margin:12px 0 8px">أحياء التغطية ({{ city.coverageAreas?.length || 0 }})</p>
                @for (area of city.coverageAreas ?? []; track area.id) {
                  <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                    <input class="input" [(ngModel)]="area.nameAr" />
                    <button class="btn ghost" type="button" (click)="saveCoverage(area)">حفظ</button>
                    <button class="btn ghost" type="button" (click)="toggleCoverage(area)">
                      {{ area.isVisible ? 'إخفاء' : 'إظهار' }}
                    </button>
                  </div>
                }
                <div class="form-grid">
                  <div class="field">
                    <label>رمز الحي</label>
                    <input class="input" [(ngModel)]="coverageDrafts[city.id].code" placeholder="NORTH" />
                  </div>
                  <div class="field">
                    <label>اسم الحي</label>
                    <input class="input" [(ngModel)]="coverageDrafts[city.id].nameAr" placeholder="شمال المدينة" />
                  </div>
                </div>
                <button class="btn soft" style="margin-top:10px" type="button" (click)="createCoverage(city)">
                  إضافة حي تغطية
                </button>
              </div>
            }

            <div class="form-grid" style="margin-top:8px">
              <div class="field">
                <label>رمز المدينة</label>
                <input class="input" [(ngModel)]="cityDrafts[region.id].code" placeholder="DHAHRAN" />
              </div>
              <div class="field">
                <label>اسم المدينة</label>
                <input class="input" [(ngModel)]="cityDrafts[region.id].nameAr" placeholder="الظهران" />
              </div>
            </div>
            <button class="btn soft" style="margin-top:12px" type="button" (click)="createCity(region)">
              إضافة مدينة للمنطقة
            </button>
          </article>
        }
      </div>
    }
  `,
})
export class OpsGeoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  regions: OpsRegion[] = [];
  loading = true;
  regionDraft = { code: '', nameAr: '', nameEn: '', sortOrder: 0 };
  cityDrafts: Record<string, { code: string; nameAr: string }> = {};
  coverageDrafts: Record<string, { code: string; nameAr: string }> = {};

  ngOnInit(): void {
    this.shell.set('المناطق والمدن', 'منطقة واحدة تتسع لعدة مدن');
    this.load();
  }

  createRegion(): void {
    if (!this.regionDraft.code.trim() || this.regionDraft.nameAr.trim().length < 2) {
      this.toast.show('أدخلي رمز المنطقة واسمها');
      return;
    }
    this.api
      .opsCreateRegion({
        code: this.regionDraft.code,
        nameAr: this.regionDraft.nameAr,
        nameEn: this.regionDraft.nameEn || undefined,
        sortOrder: Number(this.regionDraft.sortOrder) || 0,
        isVisible: true,
      })
      .subscribe({
        next: () => {
          this.toast.show('تمت إضافة المنطقة');
          this.regionDraft = { code: '', nameAr: '', nameEn: '', sortOrder: 0 };
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة المنطقة')),
      });
  }

  saveRegion(region: OpsRegion): void {
    this.api
      .opsPatchRegion(region.id, {
        nameAr: region.nameAr,
        nameEn: region.nameEn,
        sortOrder: Number(region.sortOrder) || 0,
      })
      .subscribe({
        next: () => this.toast.show('تم حفظ المنطقة'),
        error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ المنطقة')),
      });
  }

  toggleRegion(region: OpsRegion): void {
    this.api.opsPatchRegion(region.id, { isVisible: !region.isVisible }).subscribe({
      next: (row) => {
        region.isVisible = row.isVisible;
        this.toast.show(row.isVisible ? 'المنطقة ظاهرة في التسجيل والبحث' : 'تم إخفاء المنطقة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير ظهور المنطقة')),
    });
  }

  createCity(region: OpsRegion): void {
    const draft = this.cityDrafts[region.id];
    if (!draft?.code.trim() || (draft.nameAr.trim().length ?? 0) < 2) {
      this.toast.show('أدخلي رمز المدينة واسمها');
      return;
    }
    this.api
      .opsCreateCity({
        regionId: region.id,
        code: draft.code,
        nameAr: draft.nameAr,
        isVisible: true,
      })
      .subscribe({
        next: () => {
          this.toast.show('تمت إضافة المدينة');
          this.cityDrafts[region.id] = { code: '', nameAr: '' };
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة المدينة')),
      });
  }

  saveCity(city: OpsCity): void {
    this.api
      .opsPatchCity(city.id, {
        nameAr: city.nameAr,
        nameEn: city.nameEn,
      })
      .subscribe({
        next: () => this.toast.show('تم حفظ المدينة'),
        error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ المدينة')),
      });
  }

  toggleCity(city: OpsCity): void {
    this.api.opsPatchCity(city.id, { isVisible: !city.isVisible }).subscribe({
      next: (row) => {
        city.isVisible = row.isVisible;
        this.toast.show(row.isVisible ? 'المدينة ظاهرة' : 'تم إخفاء المدينة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير ظهور المدينة')),
    });
  }

  createCoverage(city: OpsCity): void {
    const draft = this.coverageDrafts[city.id];
    if (!draft?.code.trim() || draft.nameAr.trim().length < 2) {
      this.toast.show('أدخلي رمز الحي واسمه');
      return;
    }
    this.api
      .opsCreateCoverage({ cityId: city.id, code: draft.code, nameAr: draft.nameAr, isVisible: true })
      .subscribe({
        next: () => {
          this.toast.show('تمت إضافة حي التغطية');
          this.coverageDrafts[city.id] = { code: '', nameAr: '' };
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الحي')),
      });
  }

  saveCoverage(area: OpsCoverage): void {
    this.api.opsPatchCoverage(area.id, { nameAr: area.nameAr, nameEn: area.nameEn }).subscribe({
      next: () => this.toast.show('تم حفظ الحي'),
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الحي')),
    });
  }

  toggleCoverage(area: OpsCoverage): void {
    this.api.opsPatchCoverage(area.id, { isVisible: !area.isVisible }).subscribe({
      next: (row) => {
        area.isVisible = row.isVisible;
        this.toast.show(row.isVisible ? 'الحي ظاهر' : 'تم إخفاء الحي');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير ظهور الحي')),
    });
  }

  private load(): void {
    this.loading = true;
    this.api.opsRegions().subscribe({
      next: (regions) => {
        this.regions = regions;
        for (const region of regions) {
          this.cityDrafts[region.id] ??= { code: '', nameAr: '' };
          for (const city of region.cities) {
            this.coverageDrafts[city.id] ??= { code: '', nameAr: '' };
          }
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل المناطق'));
      },
    });
  }
}
