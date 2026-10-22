import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
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
      <div class="avatar-pick has-photo" style="margin-bottom:22px">
        <button class="account-photo" type="button" (click)="picker.click()" [disabled]="uploading">
          @if (previewUrl) {
            <img [src]="previewUrl" alt="" />
          } @else {
            {{ displayName.slice(0, 1) || 'ن' }}
          }
        </button>
        <div>
          <label>صورة الحساب</label>
          <button class="btn secondary" type="button" (click)="picker.click()" [disabled]="uploading">
            {{ uploading ? 'جاري رفع الصورة...' : previewUrl ? 'تغيير الصورة' : 'رفع صورة' }}
          </button>
          <small class="muted">JPG أو PNG حتى 5 ميجا</small>
        </div>
        <input #picker type="file" hidden accept="image/jpeg,image/png,image/webp" (change)="onPhoto($event)" />
      </div>
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
        <div class="field full">
          <label>نبذة عنكِ</label>
          <textarea class="input" name="bio" rows="4" [(ngModel)]="bio" [maxlength]="bioMax" placeholder="اكتبي نبذة قصيرة عنكِ"></textarea>
          <small class="muted">{{ bio.length }} / {{ bioMax }}</small>
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
  bio = '';
  bioMax = 300;
  previewUrl = '';
  regions: CatalogRegion[] = [];
  loading = false;
  uploading = false;

  get cities() {
    return this.regions.find((region) => region.id === this.regionId)?.cities ?? [];
  }

  ngOnInit(): void {
    this.shell.set('حسابي', 'حدّثي المعلومات الأساسية لحساب العميلة');
    this.api.platformSettings().subscribe({
      next: (settings) => {
        this.bioMax = settings.customerBioMax || 300;
      },
    });
    this.api.regions().subscribe({
      next: (regions) => {
        this.regions = regions;
        if (this.cityId && !this.regionId) {
          this.regionId = regions.find((region) => region.cities.some((city) => city.id === this.cityId))?.id ?? '';
        }
      },
    });
    this.previewUrl = mediaUrl(this.session.user()?.avatarUrl) || '';
    this.api.customerProfile().subscribe({
      next: (profile) => {
        this.displayName = profile.displayName;
        this.mobile = profile.mobile ?? '';
        this.accountCode = profile.accountCode;
        this.bio = profile.bio ?? '';
        this.cityId = profile.city?.id ?? '';
        this.previewUrl = mediaUrl(profile.avatarUrl) || this.previewUrl;
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

  onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!/^image\/(jpeg|png|webp|jpg)$/i.test(file.type)) {
      this.toast.show('الصورة لازم تكون JPG أو PNG');
      return;
    }
    this.previewUrl = URL.createObjectURL(file);
    this.uploading = true;
    this.api.uploadCustomerAvatar(file).subscribe({
      next: (profile) => {
        this.previewUrl = mediaUrl(profile.avatarUrl) || this.previewUrl;
        this.uploading = false;
        this.session.patchUser({ avatarUrl: profile.avatarUrl });
        this.toast.show('تم رفع صورة الحساب');
      },
      error: (err) => {
        this.uploading = false;
        this.toast.show(apiMessage(err, 'تعذر رفع الصورة'));
      },
    });
  }

  save(): void {
    if (this.bio.length > this.bioMax) {
      this.toast.show(`نبذة العميلة بحد أقصى ${this.bioMax} حرف`);
      return;
    }
    this.loading = true;
    this.api.updateCustomerProfile({ displayName: this.displayName, cityId: this.cityId || undefined, bio: this.bio }).subscribe({
      next: (profile) => {
        this.previewUrl = mediaUrl(profile.avatarUrl) || this.previewUrl;
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
