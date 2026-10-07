import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage, displayPhone } from '../core/phone';
import type { CatalogRegion, ProviderMe } from '../core/models';
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
            <label>المنطقة</label>
            <select name="regionId" [(ngModel)]="regionId" (ngModelChange)="onRegionChange()">
              <option value="">اختاري المنطقة</option>
              @for (region of regions; track region.id) {
                <option [value]="region.id">{{ region.nameAr }}</option>
              }
            </select>
          </div>
        </div>
        <div class="field city-multi">
          <label>المدن</label>
          <small class="city-hint">يمكنك اختيار أكثر من مدينة في نفس المنطقة</small>
          <div class="chips">
            @if (!regionId) {
              <span class="muted small">اختاري المنطقة أولًا</span>
            }
            @for (city of cities; track city.id) {
              <button class="chip" type="button" [class.active]="cityIds.includes(city.id)" (click)="toggleCity(city.id)">
                {{ city.nameAr }}
              </button>
            }
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
  regionId = '';
  cityIds: string[] = [];
  email = '';
  bio = '';
  previewUrl = '';
  regions: CatalogRegion[] = [];
  loading = false;
  uploading = false;
  dirty = false;

  get cities() {
    return this.regions.find((region) => region.id === this.regionId)?.cities ?? [];
  }

  get cityName(): string {
    const names = this.cityIds
      .map((id) => this.regions.flatMap((region) => region.cities).find((city) => city.id === id)?.nameAr)
      .filter((name): name is string => Boolean(name));
    return names.join(' · ') || 'المدينة';
  }

  get loginMobile(): string {
    return displayPhone(this.profile?.mobile || this.session.user()?.mobile || '');
  }

  ngOnInit(): void {
    this.shell.set('الملف الشخصي');
    this.api.regions().subscribe({
      next: (regions) => {
        this.regions = regions;
        this.syncRegionFromCities();
      },
    });
    this.api.providerProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.displayName = profile.displayName;
        this.cityIds = (profile.cities?.length ? profile.cities : profile.city ? [profile.city] : []).map(
          (city) => city.id,
        );
        this.email = profile.email ?? '';
        this.bio = profile.bio ?? '';
        this.previewUrl = mediaUrl(profile.avatarUrl) || '';
        this.session.patchUser({ displayName: profile.displayName, city: profile.city });
        this.syncRegionFromCities();
      },
    });
  }

  onRegionChange(): void {
    const allowed = new Set(this.cities.map((city) => city.id));
    this.cityIds = this.cityIds.filter((id) => allowed.has(id));
    this.dirty = true;
  }

  toggleCity(id: string): void {
    if (this.cityIds.includes(id)) {
      this.cityIds = this.cityIds.filter((cityId) => cityId !== id);
    } else {
      this.cityIds = [...this.cityIds, id];
    }
    this.dirty = true;
  }

  private syncRegionFromCities(): void {
    const selectedId = this.cityIds[0];
    if (!selectedId || this.regionId || !this.regions.length) {
      return;
    }
    this.regionId =
      this.regions.find((region) => region.cities.some((city) => city.id === selectedId))?.id ?? '';
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
    if (!this.cityIds.length) {
      this.toast.show('اختاري مدينة واحدة على الأقل');
      return;
    }
    this.loading = true;
    this.api
      .updateProviderProfile({
        displayName: this.displayName.trim(),
        cityId: this.cityIds[0],
        cityIds: this.cityIds,
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
