import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage, displayPhone } from '../core/phone';
import type { CatalogRegion, ProviderMe } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-account',
  imports: [FormsModule, IconComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ locale.t('p.acc.title') }}</h1>
        <p>{{ locale.t('p.acc.sub') }}</p>
      </div>
      <button class="btn primary" type="button" [hidden]="!dirty" [disabled]="loading" (click)="save()">{{ locale.t('p.acc.save') }}</button>
    </div>
    <div class="grid wide-side">
      <form class="card" (ngSubmit)="save()">
        <div class="grid cols-2">
          <div class="field">
            <label>{{ locale.t('c.account.displayName') }}</label>
            <input name="displayName" [(ngModel)]="displayName" (ngModelChange)="dirty = true" />
          </div>
          <div class="field">
            <label>{{ locale.t('c.account.region') }}</label>
            <select name="regionId" [(ngModel)]="regionId" (ngModelChange)="onRegionChange()">
              <option value="">{{ locale.t('c.account.pickRegion') }}</option>
              @for (region of regions; track region.id) {
                <option [value]="region.id">{{ locale.localizedName(region) }}</option>
              }
            </select>
          </div>
        </div>
        <div class="field city-multi">
          <label>{{ locale.t('p.acc.cities') }}</label>
          <small class="city-hint">{{ locale.t('p.acc.citiesHint') }}</small>
          <div class="chips">
            @if (!regionId) {
              <span class="muted small">{{ locale.t('p.acc.pickRegionFirst') }}</span>
            }
            @for (city of cities; track city.id) {
              <button class="chip" type="button" [class.active]="cityIds.includes(city.id)" (click)="toggleCity(city.id)">
                {{ locale.localizedName(city) }}
              </button>
            }
          </div>
        </div>
        <div class="grid cols-2">
          <!-- <div class="field">
            <label>{{ locale.t('p.acc.whatsapp') }}</label>
            <input dir="ltr" [value]="loginMobile" disabled />
            <small class="muted">{{ locale.t('p.acc.whatsappHint') }}</small>
          </div> -->
          <div class="field">
            <label>{{ locale.t('p.acc.email') }} <span class="muted">{{ locale.t('p.acc.optional') }}</span></label>
            <input type="email" dir="ltr" name="email" [(ngModel)]="email" placeholder="name@example.com" (ngModelChange)="dirty = true" />
          </div>
        </div>
        <div class="field">
          <label>{{ locale.t('p.acc.bio') }}</label>
          <textarea name="bio" [(ngModel)]="bio" [maxlength]="bioMax" (ngModelChange)="dirty = true"></textarea>
          <small class="muted">{{ bio.length }} / {{ bioMax }}</small>
        </div>
      </form>
      <div class="card empty">
        <div class="avatar" style="width:88px;height:88px;margin:auto;font-size:28px;background-size:cover;background-position:center" [style.background-image]="previewUrl ? 'url(' + previewUrl + ')' : 'none'">
          @if (!previewUrl) {
            <app-icon name="profile" />
          }
        </div>
        <h3>{{ displayName || locale.t('p.nameFallback') }}</h3>
        @if (profile?.badge) {
          <span class="badge">✓ {{ locale.t('p.acc.verified') }}</span>
        }
        <p class="small muted">{{ cityName }}</p>
        <button class="btn secondary" type="button" (click)="picker.click()" [disabled]="uploading">
          {{ uploading ? locale.t('c.account.uploading') : locale.t('c.account.changePhoto') }}
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
  readonly locale = inject(LocaleService);

  profile: ProviderMe | null = null;
  displayName = '';
  regionId = '';
  cityIds: string[] = [];
  email = '';
  bio = '';
  bioMax = 1000;
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
      .map((id) => {
        const city = this.regions.flatMap((region) => region.cities).find((item) => item.id === id);
        return city ? this.locale.localizedName(city) : '';
      })
      .filter((name): name is string => Boolean(name));
    return names.join(' · ') || this.locale.t('shell.city');
  }

  get loginMobile(): string {
    return displayPhone(this.profile?.mobile || this.session.user()?.mobile || '');
  }

  ngOnInit(): void {
    this.shell.set('nav.profile');
    this.api.platformSettings().subscribe({
      next: (settings) => {
        this.bioMax = settings.providerBioMax || 1000;
      },
    });
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
      this.toast.show(this.locale.t('c.account.badImage'));
      return;
    }
    this.previewUrl = URL.createObjectURL(file);
    this.uploading = true;
    this.api.uploadProviderAvatar(file).subscribe({
      next: (profile) => {
        this.previewUrl = mediaUrl(profile.avatarUrl) || this.previewUrl;
        this.uploading = false;
        this.toast.show(this.locale.t('c.account.photoOk'));
      },
      error: (err) => {
        this.uploading = false;
        this.toast.show(apiMessage(err, this.locale.t('c.account.photoFail')));
      },
    });
  }

  save(): void {
    if (!this.cityIds.length) {
      this.toast.show(this.locale.t('p.acc.needCity'));
      return;
    }
    if (this.bio.length > this.bioMax) {
      this.toast.show(this.locale.tf('p.acc.bioMax', { n: this.bioMax }));
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
          this.toast.show(this.locale.t('p.acc.saved'));
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, this.locale.t('c.account.saveFail')));
        },
      });
  }
}
