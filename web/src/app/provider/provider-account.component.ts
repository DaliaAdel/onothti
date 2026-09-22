import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import type { CatalogCity } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-account',
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
          <label>مدينة تقديم الخدمة</label>
          <select class="input" name="cityId" [(ngModel)]="cityId">
            <option value="">اختاري المدينة</option>
            @for (city of cities; track city.id) {
              <option [value]="city.id">{{ city.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>رقم التواصل عبر واتساب</label>
          <input class="input" name="whatsapp" [(ngModel)]="whatsapp" dir="ltr" placeholder="+966 5X XXX XXXX" />
        </div>
        <div class="field">
          <label>صورة الحساب</label>
          <button class="input" type="button" style="text-align:right" (click)="toast.show('رفع الصور سيُربط بعد تفعيل الوسائط')">
            رفع أو تغيير الصورة
          </button>
        </div>
        <div class="field full">
          <label>نبذة عني</label>
          <textarea class="input" name="bio" [(ngModel)]="bio" placeholder="اكتبي نبذة مهنية تظهر للباحثات"></textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:22px">
        <button class="btn primary" type="submit">حفظ وإرسال للمراجعة</button>
        <button class="btn ghost" type="button" (click)="toast.show('معاينة الملف ستكون متاحة بعد تفعيل واجهات الصانعة')">معاينة الملف</button>
      </div>
    </form>
  `,
})
export class ProviderAccountComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  readonly toast = inject(ToastService);
  private readonly shell = inject(ShellService);

  displayName = '';
  cityId = '';
  whatsapp = '';
  bio = '';
  cities: CatalogCity[] = [];

  ngOnInit(): void {
    this.shell.set('إعداد الملف الأساسي', 'حدّثي المعلومات التي تظهر للباحثات');
    this.displayName = this.session.user()?.displayName ?? '';
    this.cityId = this.session.user()?.city?.id ?? '';
    this.api.cities().subscribe({ next: (cities) => (this.cities = cities) });
  }

  save(): void {
    this.toast.show('حفظ ملف الصانعة سيُربط بعد تفعيل واجهات المزودة');
  }
}
