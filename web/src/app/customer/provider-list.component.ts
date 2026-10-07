import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { CatalogRegion, ProviderCard } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { FavoriteBtnComponent } from '../shared/favorite-btn.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-list',
  imports: [FormsModule, RouterLink, FavoriteBtnComponent, IconComponent],
  template: `
    <form class="search-row" (ngSubmit)="apply()">
      <label class="searchbox">
        <app-icon name="search" />
        <input [(ngModel)]="query" name="q" placeholder="ابحثي باسم الخبيرة..." />
      </label>
      <select class="select" name="region" [(ngModel)]="regionId" (ngModelChange)="onRegionChange()">
        <option value="">كل المناطق</option>
        @for (region of regions; track region.id) {
          <option [value]="region.id">{{ region.nameAr }}</option>
        }
      </select>
      <select class="select" name="city" [(ngModel)]="cityId" [disabled]="!regionId">
        <option value="">كل المدن</option>
        @for (city of cities; track city.id) {
          <option [value]="city.id">{{ city.nameAr }}</option>
        }
      </select>
      <button class="btn primary" type="submit">بحث</button>
    </form>
    @if (!cityId && !regionId) {
      <article class="card coming-card">
        <h2>اختاري المنطقة أو المدينة</h2>
        <p>نتائج البحث تعتمد على الموقع. حددي المنطقة ثم المدينة إن رغبتِ.</p>
      </article>
    } @else if (loading) {
      <p class="loading">جاري البحث عن الخبيرات...</p>
    } @else if (providers.length === 0) {
      <p class="page-empty">لا توجد نتائج مطابقة في هذا النطاق حاليًا.</p>
    } @else {
      <div class="grid two">
        @for (provider of providers; track provider.id) {
          <article class="card hover provider">
            <div class="provider-photo">{{ provider.displayName.slice(0, 1) }}</div>
            <div>
              <h3>{{ provider.displayName }}</h3>
              <p>{{ serviceLine(provider) }} · {{ provider.city?.nameAr || cityName }}</p>
              <div class="rating">★ {{ provider.ratingAvg ?? '—' }}@if (provider.ratingCount) { · {{ provider.ratingCount }} تقييمًا }</div>
            </div>
            <div class="provider-actions">
              <app-favorite-btn targetType="PROVIDER" [targetId]="provider.id" />
              <a class="btn ghost" [routerLink]="['/c/providers', provider.id]">عرض الملف</a>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class ProviderListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);

  query = '';
  regionId = '';
  cityId = '';
  cityName = '';
  serviceId = '';
  regions: CatalogRegion[] = [];
  providers: ProviderCard[] = [];
  loading = false;

  get cities() {
    return this.regions.find((region) => region.id === this.regionId)?.cities ?? [];
  }

  ngOnInit(): void {
    this.shell.set('الخبيرات', 'نتائج وفق البحث والمنطقة والمدينة');
    this.api.regions().subscribe({
      next: (regions) => {
        this.regions = regions;
        this.route.queryParamMap.subscribe((params) => {
          this.query = params.get('q') || '';
          this.serviceId = params.get('serviceId') || '';
          this.cityId = params.get('cityId') || this.session.user()?.city?.id || '';
          this.regionId =
            params.get('regionId') ||
            regions.find((region) => region.cities.some((city) => city.id === this.cityId))?.id ||
            '';
          this.cityName = this.cities.find((city) => city.id === this.cityId)?.nameAr ?? '';
          this.search();
        });
      },
    });
  }

  onRegionChange(): void {
    if (!this.cities.some((city) => city.id === this.cityId)) {
      this.cityId = '';
    }
  }

  apply(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.query.trim() || undefined,
        regionId: this.regionId || undefined,
        cityId: this.cityId || undefined,
        serviceId: this.serviceId || undefined,
      },
    });
  }

  serviceLine(provider: ProviderCard): string {
    return provider.services?.[0]?.nameAr || 'خدمات تجميل';
  }

  private search(): void {
    if (!this.cityId && !this.regionId) {
      this.providers = [];
      return;
    }
    this.loading = true;
    this.api
      .search({
        cityId: this.cityId || undefined,
        regionId: this.cityId ? undefined : this.regionId || undefined,
        serviceId: this.serviceId || undefined,
        q: this.query.trim() || undefined,
        page: 1,
        pageSize: 20,
      })
      .subscribe({
        next: (res) => {
          this.providers = res.items;
          this.loading = false;
        },
        error: () => {
          this.providers = [];
          this.loading = false;
        },
      });
  }
}
