import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FALLBACK_SERVICES, serviceIcon, servicePhoto, type CatalogRegion, type CatalogService } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { FavoriteBtnComponent } from '../shared/favorite-btn.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-customer-services',
  imports: [FormsModule, FavoriteBtnComponent, IconComponent],
  template: `
    <div class="search-row">
      <label class="searchbox">
        <app-icon name="search" />
        <input [(ngModel)]="query" placeholder="ابحثي عن خدمة..." aria-label="البحث عن خدمة" />
      </label>
      <select class="select" [(ngModel)]="regionId" (ngModelChange)="onRegionChange()" aria-label="المنطقة">
        <option value="">كل المناطق</option>
        @for (region of regions; track region.id) {
          <option [value]="region.id">{{ region.nameAr }}</option>
        }
      </select>
      <select class="select" [(ngModel)]="cityId" [disabled]="!regionId" aria-label="المدينة">
        <option value="">كل المدن</option>
        @for (city of cities; track city.id) {
          <option [value]="city.id">{{ city.nameAr }}</option>
        }
      </select>
    </div>
    @if (filtered.length === 0) {
      <p class="page-empty">لا توجد نتائج مطابقة.</p>
    } @else {
      <div class="grid four">
        @for (service of filtered; track service.id) {
          <article class="card hover service-card photo-service">
            <app-favorite-btn class="service-fav" targetType="SERVICE" [targetId]="service.id" />
            <button class="service-open" type="button" (click)="open(service)">
              <div class="service-art">
                <img class="service-cover" [src]="photoOf(service)" alt="" loading="lazy" decoding="async" />
                <img class="service-mini-icon" [src]="iconOf(service)" alt="" loading="lazy" decoding="async" />
              </div>
              <div class="service-body">
                <h3>{{ service.nameAr }}</h3>
                <p>{{ serviceDesc(service) }}</p>
                <span class="arrow"><app-icon name="chev" /></span>
              </div>
            </button>
          </article>
        }
      </div>
    }
  `,
})
export class CustomerServicesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellService);

  query = '';
  regionId = '';
  cityId = '';
  regions: CatalogRegion[] = [];
  services: CatalogService[] = [];

  get cities() {
    return this.regions.find((region) => region.id === this.regionId)?.cities ?? [];
  }

  get filtered(): CatalogService[] {
    const q = this.query.trim();
    return this.services.filter((service) => {
      return !q || service.nameAr.includes(q) || service.nameEn.toLowerCase().includes(q.toLowerCase());
    });
  }

  ngOnInit(): void {
    this.shell.set('تصفّح الخدمات', 'اختاري الخدمة والمنطقة والمدينة للوصول إلى النتائج المناسبة');
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
  }

  onRegionChange(): void {
    if (!this.cities.some((city) => city.id === this.cityId)) {
      this.cityId = '';
    }
  }

  open(service: CatalogService): void {
    void this.router.navigate(['/c/providers'], {
      queryParams: {
        serviceId: service.id,
        regionId: this.regionId || undefined,
        cityId: this.cityId || undefined,
      },
    });
  }

  photoOf(service: CatalogService): string {
    return servicePhoto(service);
  }

  iconOf(service: CatalogService): string {
    return serviceIcon(service);
  }

  serviceDesc(service: CatalogService): string {
    const fallback = FALLBACK_SERVICES.find((item) => item.code === service.code || item.nameAr === service.nameAr);
    return fallback?.desc ?? 'اكتشفي الخبيرات لهذه الخدمة';
  }
}
