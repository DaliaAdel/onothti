import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage, displayPhone } from '../core/phone';
import type { CatalogCity, ProviderMe } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-account',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>الملف الشخصي</h1>
        <p>حدّثي بيانات الحساب التي تظهر للعميلات</p>
      </div>
      <button class="btn primary" type="button" [hidden]="!dirty" [disabled]="loading" (click)="save()">حفظ التعديلات</button>
    </div>
    <div class="grid wide-side">
      <form class="card" (ngSubmit)="save()">
        <div class="grid cols-2">
          <div class="field">
            <label>اسم العرض</label>
            <input name="displayName" [(ngModel)]="displayName" (ngModelChange)="dirty = true" />
          </div>
          <div class="field">
            <label>المدينة</label>
            <select name="cityId" [(ngModel)]="cityId" (ngModelChange)="dirty = true">
              <option value="">اختاري المدينة</option>
              @for (city of cities; track city.id) {
                <option [value]="city.id">{{ city.nameAr }}</option>
              }
            </select>
          </div>
        </div>
        <div class="grid cols-2">
          <div class="field">
            <label>رقم التواصل عبر واتساب</label>
            <input dir="ltr" [value]="loginMobile" disabled />
            <small class="muted">هو رقم تسجيل الدخول ولا يمكن تغييره من هنا</small>
          </div>
          <div class="field">
            <label>البريد الإلكتروني <span class="muted">(اختياري)</span></label>
            <input type="email" dir="ltr" name="email" [(ngModel)]="email" placeholder="name@example.com" (ngModelChange)="dirty = true" />
          </div>
        </div>
        <div class="field">
          <label>النبذة الاحترافية</label>
          <textarea name="bio" [(ngModel)]="bio" (ngModelChange)="dirty = true"></textarea>
        </div>
      </form>
      <div class="card empty">
        <div class="avatar" style="width:88px;height:88px;margin:auto;font-size:28px;background-size:cover;background-position:center" [style.background-image]="previewUrl ? 'url(' + previewUrl + ')' : 'none'">
          @if (!previewUrl) {
            {{ displayName.slice(0, 1) || 'ن' }}
          }
        </div>
        <h3>{{ displayName || 'الخبيرة' }}</h3>
        @if (profile?.badge) {
          <span class="badge">✓ حساب موثق</span>
        }
        <p class="small muted">{{ cityName }}</p>
        <button class="btn secondary" type="button" (click)="picker.click()" [disabled]="uploading">
          {{ uploading ? 'جاري رفع الصورة...' : 'تغيير الصورة' }}
        </button>
        <input #picker type="file" hidden accept="image/jpeg,image/png,image/webp" (change)="onPhoto($event)" />
      </div>
    </div>
  `,
})
export class ProviderAccountComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  readonly toast = inject(ToastService);
  private readonly shell = inject(ShellService);

  profile: ProviderMe | null = null;
  displayName = '';
  cityId = '';
  email = '';
  bio = '';
  previewUrl = '';
  cities: CatalogCity[] = [];
  loading = false;
  uploading = false;
  dirty = false;

  get cityName(): string {
    return this.cities.find((city) => city.id === this.cityId)?.nameAr || 'المدينة';
  }

  get loginMobile(): string {
    return displayPhone(this.profile?.mobile || this.session.user()?.mobile || '');
  }

  ngOnInit(): void {
    this.shell.set('الملف الشخصي');
    this.api.cities().subscribe({ next: (cities) => (this.cities = cities) });
    this.api.providerProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.displayName = profile.displayName;
        this.cityId = profile.city?.id ?? '';
        this.email = profile.email ?? '';
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
    this.loading = true;
    this.api
      .updateProviderProfile({
        displayName: this.displayName.trim(),
        cityId: this.cityId || undefined,
        bio: this.bio,
      })
      .subscribe({
        next: (profile) => {
          this.session.patchUser({ displayName: profile.displayName, city: profile.city });
          this.previewUrl = mediaUrl(profile.avatarUrl) || this.previewUrl;
          this.loading = false;
          this.dirty = false;
          this.toast.show('تم حفظ التعديلات');
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر حفظ التغييرات'));
        },
      });
  }
}
