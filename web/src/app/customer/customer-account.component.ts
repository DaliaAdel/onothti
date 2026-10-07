import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { CatalogRegion } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-customer-account',
  imports: [FormsModule],
  template: `
    <div class="notice" style="margin-bottom:18px">يتم عرض المدينة فقط وفق القرار المعتمد، ولا يظهر الحي في بيانات الحساب.</div>
    <form class="card form-card" (ngSubmit)="save()">
      <div class="form-grid">
        <div class="field">
          <label>اسم العرض</label>
          <input class="input" name="displayName" [(ngModel)]="displayName" />
        </div>
        <div class="field">
          <label>المنطقة</label>
          <select class="input" name="regionId" [(ngModel)]="regionId" (ngModelChange)="onRegionChange()">
            <option value="">اختاري المنطقة</option>
            @for (region of regions; track region.id) {
              <option [value]="region.id">{{ region.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>المدينة</label>
          <select class="input" name="cityId" [(ngModel)]="cityId" [disabled]="!regionId">
            <option value="">اختاري المدينة</option>
            @for (city of cities; track city.id) {
              <option [value]="city.id">{{ city.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>رقم الجوال</label>
          <input class="input" [value]="mobile" disabled dir="ltr" />
        </div>
        <div class="field">
          <label>رمز الحساب</label>
          <input class="input" [value]="accountCode" disabled />
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:22px">
        <button class="btn primary" type="submit" [disabled]="loading">حفظ التغييرات</button>
      </div>
    </form>
  `,
})
export class CustomerAccountComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly shell = inject(ShellService);

  displayName = '';
  regionId = '';
  cityId = '';
  mobile = '';
  accountCode = '';
  regions: CatalogRegion[] = [];
  loading = false;

  get cities() {
    return this.regions.find((region) => region.id === this.regionId)?.cities ?? [];
  }

  ngOnInit(): void {
    this.shell.set('حسابي', 'حدّثي المعلومات الأساسية لحساب العميلة');
    this.api.regions().subscribe({
      next: (regions) => {
        this.regions = regions;
        if (this.cityId && !this.regionId) {
          this.regionId = regions.find((region) => region.cities.some((city) => city.id === this.cityId))?.id ?? '';
        }
      },
    });
    this.api.customerProfile().subscribe({
      next: (profile) => {
        this.displayName = profile.displayName;
        this.mobile = profile.mobile ?? '';
        this.accountCode = profile.accountCode;
        this.cityId = profile.city?.id ?? '';
        if (this.regions.length && this.cityId) {
          this.regionId = this.regions.find((region) => region.cities.some((city) => city.id === this.cityId))?.id ?? '';
        }
        this.session.patchUser(profile);
      },
    });
  }

  onRegionChange(): void {
    if (!this.cities.some((city) => city.id === this.cityId)) {
      this.cityId = '';
    }
  }

  save(): void {
    this.loading = true;
    this.api.updateCustomerProfile({ displayName: this.displayName, cityId: this.cityId || undefined }).subscribe({
      next: (profile) => {
        this.session.patchUser(profile);
        this.loading = false;
        this.toast.show('تم حفظ التغييرات');
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر حفظ التغييرات'));
      },
    });
  }
}
