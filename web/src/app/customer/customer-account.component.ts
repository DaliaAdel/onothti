import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { CatalogCity } from '../core/models';
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
          <label>المدينة</label>
          <select class="input" name="cityId" [(ngModel)]="cityId">
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
  cityId = '';
  mobile = '';
  accountCode = '';
  cities: CatalogCity[] = [];
  loading = false;

  ngOnInit(): void {
    this.shell.set('حسابي', 'حدّثي المعلومات الأساسية لحساب الباحثة');
    this.api.cities().subscribe({ next: (cities) => (this.cities = cities) });
    this.api.customerProfile().subscribe({
      next: (profile) => {
        this.displayName = profile.displayName;
        this.mobile = profile.mobile ?? '';
        this.accountCode = profile.accountCode;
        this.cityId = profile.city?.id ?? '';
        this.session.patchUser(profile);
      },
    });
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
