import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage, isSaudiMobile, toMobile } from '../core/phone';
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
          <input class="input" name="whatsapp" [(ngModel)]="whatsapp" dir="ltr" placeholder="0501234567" />
        </div>
        <div class="field">
          <label>صورة الحساب</label>
          <div class="avatar-pick" [class.has-photo]="!!previewUrl">
            @if (previewUrl) {
              <img [src]="previewUrl" alt="صورة الحساب" />
            }
            <button class="input" type="button" style="text-align:right" (click)="picker.click()" [disabled]="uploading">
              {{ uploading ? 'جاري رفع الصورة...' : 'رفع أو تغيير الصورة' }}
            </button>
            <input #picker type="file" hidden accept="image/jpeg,image/png,image/webp" (change)="onPhoto($event)" />
          </div>
        </div>
        <div class="field full">
          <label>نبذة عني</label>
          <textarea class="input" name="bio" [(ngModel)]="bio" placeholder="اكتبي نبذة مهنية تظهر للباحثات"></textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:22px">
        <button class="btn primary" type="submit" [disabled]="loading">حفظ وإرسال للمراجعة</button>
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
  previewUrl = '';
  cities: CatalogCity[] = [];
  loading = false;
  uploading = false;

  ngOnInit(): void {
    this.shell.set('إعداد الملف الأساسي', 'حدّثي المعلومات التي تظهر للباحثات');
    this.api.cities().subscribe({ next: (cities) => (this.cities = cities) });
    this.api.providerProfile().subscribe({
      next: (profile) => {
        this.displayName = profile.displayName;
        this.cityId = profile.city?.id ?? '';
        this.whatsapp = profile.whatsapp ?? '';
        this.bio = profile.bio ?? '';
        this.previewUrl = mediaUrl(profile.avatarUrl) || '';
        this.session.patchUser({ displayName: profile.displayName, city: profile.city });
      },
    });
  }

  onPhoto(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    if (!/^image\/(jpeg|png|webp|jpg)$/i.test(file.type)) {
      this.toast.show('الصورة لازم تكون JPG أو PNG');
      return;
    }
    this.previewUrl = URL.createObjectURL(file);
    this.uploading = true;
    this.api.uploadProviderAvatar(file).subscribe({
      next: (profile) => {
        this.previewUrl = mediaUrl(profile.avatarUrl) || this.previewUrl;
        this.uploading = false;
        this.toast.show('تم رفع صورة الحساب');
      },
      error: (err) => {
        this.uploading = false;
        this.toast.show(apiMessage(err, 'تعذر رفع الصورة'));
      },
    });
  }

  save(): void {
    if (this.whatsapp.trim() && !isSaudiMobile(this.whatsapp)) {
      this.toast.show('رقم الجوال لازم يكون سعودي 10 أرقام ويبدأ بـ 05');
      return;
    }
    this.loading = true;
    this.api
      .updateProviderProfile({
        displayName: this.displayName.trim(),
        cityId: this.cityId || undefined,
        bio: this.bio,
        whatsapp: this.whatsapp.trim() ? toMobile(this.whatsapp) : undefined,
      })
      .subscribe({
        next: (profile) => {
          this.session.patchUser({ displayName: profile.displayName, city: profile.city });
          this.previewUrl = mediaUrl(profile.avatarUrl) || this.previewUrl;
          this.loading = false;
          this.toast.show('تم حفظ التغييرات وإرسالها للمراجعة');
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر حفظ التغييرات'));
        },
      });
  }
}
