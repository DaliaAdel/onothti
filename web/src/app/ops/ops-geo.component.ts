import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsCity, OpsRegion } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsModalComponent } from './ops-modal.component';
import { PositiveIntDirective } from './positive-int.directive';
import { keepSelected } from './ops-ui';

const emptyRegionDraft = () => ({ nameAr: '', nameEn: '', sortOrder: '' as number | '' });
const emptyCityDraft = () => ({ nameAr: '', nameEn: '' });

@Component({
  selector: 'app-ops-geo',
  imports: [FormsModule, OpsModalComponent, PositiveIntDirective],
  template: `
    @if (!selected) {
      <div class="section-head">
        <div>
          <h2>المناطق والمدن</h2>
          <p>اضغطي على صف المنطقة لعرض مدنها</p>
        </div>
        <button class="btn primary" type="button" (click)="adding = true">+ إضافة منطقة</button>
      </div>

      <app-ops-modal [open]="adding" title="إضافة منطقة" kicker="التغطية الجغرافية" (closed)="adding = false">
        <div class="form-grid">
          <div class="field">
            <label>الاسم *</label>
            <input class="input" [(ngModel)]="regionDraft.nameAr" placeholder="الشرقية" />
          </div>
          <div class="field">
            <label>الاسم الإنجليزي *</label>
            <input class="input" [(ngModel)]="regionDraft.nameEn" placeholder="Eastern" />
          </div>
          <div class="field">
            <label>الترتيب</label>
            <input class="input" inputmode="numeric" positiveInt [(ngModel)]="regionDraft.sortOrder" />
          </div>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createRegion()">إضافة المنطقة</button>
      </app-ops-modal>

      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!regions.length) {
        <p class="page-empty">لا توجد مناطق بعد.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الاسم الإنجليزي</th>
                <th>المدن</th>
                <th>الترتيب</th>
                <th>الظهور</th>
              </tr>
            </thead>
            <tbody>
              @for (region of regions; track region.id) {
                <tr (click)="openRegion(region)">
                  <td><b>{{ region.nameAr }}</b></td>
                  <td>{{ region.nameEn }}</td>
                  <td>{{ region.cities.length }}</td>
                  <td>{{ region.sortOrder }}</td>
                  <td>
                    <span class="status {{ region.isVisible ? 'success' : 'error' }}">
                      {{ region.isVisible ? 'ظاهرة' : 'مخفية' }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else if (!selectedCity) {
      <div class="section-head">
        <div>
          <button class="text-link back" type="button" (click)="closeRegion()">→ رجوع للمناطق</button>
          <h2>{{ selected.nameAr }}</h2>
          <p>{{ selected.nameEn }} · {{ selected.cities.length }} مدينة</p>
        </div>
        <button class="btn primary" type="button" (click)="openAddCity()">+ إضافة مدينة</button>
      </div>

      <div class="form-grid" style="margin-bottom:18px">
        <div class="field">
          <label>الاسم *</label>
          <input class="input" [(ngModel)]="selected.nameAr" />
        </div>
        <div class="field">
          <label>الاسم الإنجليزي *</label>
          <input class="input" [(ngModel)]="selected.nameEn" />
        </div>
        <div class="field">
          <label>الترتيب</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="selected.sortOrder" />
        </div>
      </div>
      <div class="ops-drawer-actions" style="margin:0 0 22px">
        <button class="btn primary" type="button" (click)="saveRegion(selected)">حفظ المنطقة</button>
        <button class="btn ghost" type="button" (click)="toggleRegion(selected)">
          {{ selected.isVisible ? 'إخفاء' : 'إظهار' }}
        </button>
      </div>

      <div class="section-head">
        <div>
          <h2>المدن</h2>
          <p>اضغطي على صف لتعديل المدينة</p>
        </div>
      </div>
      @if (!selected.cities.length) {
        <p class="page-empty">لا توجد مدن بعد.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الاسم الإنجليزي</th>
                <th>الظهور</th>
              </tr>
            </thead>
            <tbody>
              @for (city of selected.cities; track city.id) {
                <tr (click)="openCity(city)">
                  <td><b>{{ city.nameAr }}</b></td>
                  <td>{{ city.nameEn }}</td>
                  <td>
                    <span class="status {{ city.isVisible ? 'success' : 'error' }}">
                      {{ city.isVisible ? 'ظاهرة' : 'مخفية' }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      <div class="section-head">
        <div>
          <button class="text-link back" type="button" (click)="closeCity()">→ رجوع لـ {{ selected.nameAr }}</button>
          <h2>{{ selectedCity.nameAr }}</h2>
          <p>{{ selectedCity.nameEn }}</p>
        </div>
      </div>

      <div class="form-grid" style="margin-bottom:18px">
        <div class="field">
          <label>الاسم *</label>
          <input class="input" [(ngModel)]="selectedCity.nameAr" />
        </div>
        <div class="field">
          <label>الاسم الإنجليزي *</label>
          <input class="input" [(ngModel)]="selectedCity.nameEn" />
        </div>
      </div>
      <div class="ops-drawer-actions" style="margin:0 0 22px">
        <button class="btn primary" type="button" (click)="saveCity(selectedCity)">حفظ المدينة</button>
        <button class="btn ghost" type="button" (click)="toggleCity(selectedCity)">
          {{ selectedCity.isVisible ? 'إخفاء' : 'إظهار' }}
        </button>
      </div>
    }

    <app-ops-modal [open]="addingCity" title="إضافة مدينة" [kicker]="selected?.nameAr || ''" (closed)="addingCity = false">
      <div class="form-grid">
        <div class="field">
          <label>الاسم *</label>
          <input class="input" [(ngModel)]="cityDraft.nameAr" placeholder="الظهران" />
        </div>
        <div class="field">
          <label>الاسم الإنجليزي *</label>
          <input class="input" [(ngModel)]="cityDraft.nameEn" placeholder="Dhahran" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createCity()">إضافة المدينة</button>
    </app-ops-modal>
  `,
})
export class OpsGeoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  loading = true;
  adding = false;
  addingCity = false;
  regions: OpsRegion[] = [];
  selected: OpsRegion | null = null;
  selectedCity: OpsCity | null = null;
  regionDraft = emptyRegionDraft();
  cityDraft = emptyCityDraft();

  ngOnInit(): void {
    this.shell.set('المناطق والمدن', 'منطقة واحدة تتسع لعدة مدن');
    this.load();
  }

  openRegion(region: OpsRegion): void {
    this.selected = region;
    this.selectedCity = null;
    this.shell.set(region.nameAr, region.nameEn || 'مدن المنطقة');
  }

  closeRegion(): void {
    this.selected = null;
    this.selectedCity = null;
    this.shell.set('المناطق والمدن', 'منطقة واحدة تتسع لعدة مدن');
  }

  openCity(city: OpsCity): void {
    this.selectedCity = city;
    this.shell.set(city.nameAr, city.nameEn || 'تعديل المدينة');
  }

  closeCity(): void {
    this.selectedCity = null;
    if (this.selected) {
      this.shell.set(this.selected.nameAr, this.selected.nameEn || 'مدن المنطقة');
    }
  }

  createRegion(): void {
    if (!this.hasNames(this.regionDraft.nameAr, this.regionDraft.nameEn)) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
      return;
    }
    this.api
      .opsCreateRegion({
        nameAr: this.regionDraft.nameAr.trim(),
        nameEn: this.regionDraft.nameEn.trim(),
        sortOrder: Number(this.regionDraft.sortOrder) || 0,
        isVisible: true,
      })
      .subscribe({
        next: () => {
          this.toast.show('تمت إضافة المنطقة');
          this.regionDraft = emptyRegionDraft();
          this.adding = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة المنطقة')),
      });
  }

  saveRegion(region: OpsRegion): void {
    if (!this.hasNames(region.nameAr, region.nameEn)) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
      return;
    }
    this.api
      .opsPatchRegion(region.id, {
        nameAr: region.nameAr.trim(),
        nameEn: region.nameEn.trim(),
        sortOrder: Number(region.sortOrder) || 0,
      })
      .subscribe({
        next: (row) => {
          region.nameAr = row.nameAr;
          region.nameEn = row.nameEn;
          region.sortOrder = row.sortOrder;
          this.shell.set(region.nameAr, region.nameEn || 'مدن المنطقة');
          this.toast.show('تم حفظ المنطقة');
        },
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

  openAddCity(): void {
    this.cityDraft = emptyCityDraft();
    this.addingCity = true;
  }

  createCity(): void {
    if (!this.selected) {
      return;
    }
    if (!this.hasNames(this.cityDraft.nameAr, this.cityDraft.nameEn)) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
      return;
    }
    this.api
      .opsCreateCity({
        regionId: this.selected.id,
        nameAr: this.cityDraft.nameAr.trim(),
        nameEn: this.cityDraft.nameEn.trim(),
        isVisible: true,
      })
      .subscribe({
        next: () => {
          this.toast.show('تمت إضافة المدينة');
          this.cityDraft = emptyCityDraft();
          this.addingCity = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة المدينة')),
      });
  }

  saveCity(city: OpsCity): void {
    if (!this.hasNames(city.nameAr, city.nameEn)) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
      return;
    }
    this.api
      .opsPatchCity(city.id, {
        nameAr: city.nameAr.trim(),
        nameEn: city.nameEn.trim(),
      })
      .subscribe({
        next: (row) => {
          city.nameAr = row.nameAr;
          city.nameEn = row.nameEn;
          this.shell.set(city.nameAr, city.nameEn || 'تعديل المدينة');
          this.toast.show('تم حفظ المدينة');
        },
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

  private hasNames(nameAr: string, nameEn: string): boolean {
    return nameAr.trim().length >= 2 && nameEn.trim().length >= 2;
  }

  private load(): void {
    this.loading = true;
    this.api.opsRegions().subscribe({
      next: (regions) => {
        this.regions = regions;
        this.selected = keepSelected(this.regions, this.selected);
        this.selectedCity = this.selected ? keepSelected(this.selected.cities, this.selectedCity) : null;
        if (this.selectedCity) {
          this.shell.set(this.selectedCity.nameAr, this.selectedCity.nameEn || 'تعديل المدينة');
        } else if (this.selected) {
          this.shell.set(this.selected.nameAr, this.selected.nameEn || 'مدن المنطقة');
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
