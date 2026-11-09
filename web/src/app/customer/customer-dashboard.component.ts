import { Component, OnInit, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import {
  FALLBACK_SERVICES,
  serviceIcon,
  servicePhoto,
  type CatalogRegion,
  type CatalogService,
  type ProviderCard,
} from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { InitialsPipe } from '../core/name-initials';
import { FavoriteBtnComponent } from '../shared/favorite-btn.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-customer-dashboard',
  imports: [FormsModule, RouterLink, FavoriteBtnComponent, IconComponent, InitialsPipe],
  template: `
    <section class="home-search card">
      <div>
        <span class="eyebrow">{{ locale.t('c.hero.eyebrow') }}</span>
        <h2>{{ locale.t('c.hello') }}{{ name ? (locale.lang() === 'en' ? ', ' : '، ') + name : '' }}</h2>
        <p>{{ locale.t('c.searchText') }}</p>
      </div>
      <form class="search-row home-search-row" (ngSubmit)="search()">
        <label class="searchbox">
          <app-icon name="search" />
          <input [(ngModel)]="query" name="q" [placeholder]="locale.t('c.searchPlaceholder')" />
        </label>
        <select class="select" name="region" [(ngModel)]="regionId" (ngModelChange)="onRegionChange()">
          <option value="">{{ locale.t('c.allRegions') }}</option>
          @for (region of regions; track region.id) {
            <option [value]="region.id">{{ locale.localizedName(region) }}</option>
          }
        </select>
        <select class="select" name="city" [(ngModel)]="cityId" [disabled]="!regionId">
          <option value="">{{ locale.t('c.allCities') }}</option>
          @for (city of cities; track city.id) {
            <option [value]="city.id">{{ locale.localizedName(city) }}</option>
          }
        </select>
        <button class="btn primary" type="submit">{{ locale.t('c.search') }}</button>
      </form>
    </section>

    <div class="home-metrics">
      <div><b>+1,200</b><span>{{ locale.t('c.trust.experts') }}</span></div>
      <div><b>+60</b><span>{{ locale.t('c.trust.subs') }}</span></div>
      <div><b>15</b><span>{{ locale.t('c.trust.cities') }}</span></div>
      <div><b>4.9</b><span>{{ locale.t('c.trust.rating') }}</span></div>
    </div>

    <div class="section-head">
      <div>
        <h2>{{ locale.t('c.services.title') }}</h2>
        <p>{{ locale.t('c.services.sub') }}</p>
      </div>
      <a class="text-link" routerLink="/c/services">{{ locale.t('c.services.all') }}</a>
    </div>
    <div class="grid four">
      @for (service of previewServices; track service.id) {
        <a class="card hover service-card photo-service" [routerLink]="['/c/providers']" [queryParams]="serviceParams(service)">
          <div class="service-art">
            <img class="service-cover" [src]="photoOf(service)" alt="" loading="lazy" decoding="async" />
            <img class="service-mini-icon" [src]="iconOf(service)" alt="" loading="lazy" decoding="async" />
          </div>
          <div class="service-body">
            <h3>{{ locale.localizedName(service) }}</h3>
            <p>{{ serviceDesc(service) }}</p>
            <span class="arrow"><app-icon name="chev" /></span>
          </div>
        </a>
      }
    </div>

    <div class="section-head">
      <div>
        <h2>{{ locale.t('c.picks.title') }}</h2>
        <p>{{ locale.t('c.picks.sub') }}</p>
      </div>
      <a class="text-link" routerLink="/c/providers">{{ locale.t('c.picks.all') }}</a>
    </div>
    @if (providers.length === 0) {
      <p class="page-empty">{{ locale.t('c.empty') }}</p>
    } @else {
      <div class="grid two">
        @for (provider of providers; track provider.id) {
          <article class="card hover provider">
            <div class="provider-photo">{{ provider.displayName | initials }}</div>
            <div>
              <h3>{{ provider.displayName }}</h3>
              <p>{{ serviceLine(provider) }} · {{ locale.localizedName(provider.city, locale.t('c.country')) }}</p>
              <div class="rating">★ {{ provider.ratingAvg ?? '—' }}@if (provider.ratingCount) { · {{ provider.ratingCount }} {{ locale.t('c.ratingsCount') }} }</div>
            </div>
            <div class="provider-actions">
              <app-favorite-btn targetType="PROVIDER" [targetId]="provider.id" />
              <a class="btn ghost" [routerLink]="['/c/providers', provider.id]">{{ locale.t('c.view') }}</a>
            </div>
          </article>
        }
      </div>
    }

    <div class="section-head">
      <div>
        <h2>{{ locale.t('c.shortcuts.title') }}</h2>
        <p>{{ locale.t('c.shortcuts.sub') }}</p>
      </div>
    </div>
    <div class="grid four home-shortcuts">
      <a class="card hover" routerLink="/c/favorites"><span class="shortcut-icon"><app-icon name="heart" /></span><b>{{ locale.t('c.shortcuts.fav') }}</b><span>{{ locale.t('c.shortcuts.favText') }}</span></a>
      <a class="card hover" routerLink="/c/requests"><span class="shortcut-icon"><app-icon name="support" /></span><b>{{ locale.t('c.shortcuts.requests') }}</b><span>{{ locale.t('c.shortcuts.requestsText') }}</span></a>
      <a class="card hover" routerLink="/c/notifications"><span class="shortcut-icon"><app-icon name="bell" /></span><b>{{ locale.t('c.shortcuts.notify') }}</b><span>{{ locale.t('c.shortcuts.notifyText') }}</span></a>
      <a class="card hover" routerLink="/c/account"><span class="shortcut-icon"><app-icon name="profile" /></span><b>{{ locale.t('c.shortcuts.account') }}</b><span>{{ locale.t('c.shortcuts.accountText') }}</span></a>
    </div>
  `,
})
export class CustomerDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly router = inject(Router);
  readonly locale = inject(LocaleService);

  constructor() {
    effect(() => {
      this.locale.lang();
      this.shell.set('c.dash.title', 'c.dash.subtitle');
    });
  }

  query = '';
  regionId = '';
  cityId = '';
  regions: CatalogRegion[] = [];
  services: CatalogService[] = [];
  providers: ProviderCard[] = [];

  get name(): string {
    return this.session.user()?.displayName ?? '';
  }

  get cities() {
    return this.regions.find((region) => region.id === this.regionId)?.cities ?? [];
  }

  get previewServices(): CatalogService[] {
    return this.services.slice(0, 8);
  }

  ngOnInit(): void {
    this.cityId = this.session.user()?.city?.id ?? '';
    this.api.regions().subscribe({
      next: (regions) => {
        this.regions = regions;
        if (this.cityId && !this.regionId) {
          this.regionId = regions.find((region) => region.cities.some((city) => city.id === this.cityId))?.id ?? '';
        }
      },
    });
    this.api.services().subscribe({
      next: (services) => (this.services = services),
      error: () => {
        this.services = FALLBACK_SERVICES.map((item) => ({
          id: item.id,
          code: item.code,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
        }));
      },
    });
    const cityId = this.session.user()?.city?.id;
    if (!cityId) {
      return;
    }
    this.api.search({ cityId, page: 1, pageSize: 4 }).subscribe({
      next: (res) => (this.providers = res.items),
    });
  }

  onRegionChange(): void {
    if (!this.cities.some((city) => city.id === this.cityId)) {
      this.cityId = '';
    }
  }

  search(): void {
    void this.router.navigate(['/c/providers'], {
      queryParams: {
        q: this.query.trim() || undefined,
        regionId: this.regionId || undefined,
        cityId: this.cityId || undefined,
      },
    });
  }

  serviceParams(service: CatalogService) {
    return {
      serviceId: service.id,
      regionId: this.regionId || undefined,
      cityId: this.cityId || undefined,
    };
  }

  photoOf(service: CatalogService): string {
    return servicePhoto(service);
  }

  iconOf(service: CatalogService): string {
    return serviceIcon(service);
  }

  serviceDesc(service: CatalogService): string {
    const fallback = FALLBACK_SERVICES.find((item) => item.code === service.code || item.nameAr === service.nameAr);
    if (this.locale.lang() === 'en') {
      return fallback?.descEn ?? this.locale.t('c.serviceFallback');
    }
    return fallback?.desc ?? this.locale.t('c.serviceFallback');
  }

  serviceLine(provider: ProviderCard): string {
    return this.locale.localizedName(provider.services?.[0], this.locale.t('c.beauty'));
  }
}
