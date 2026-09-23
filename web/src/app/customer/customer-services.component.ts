import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FALLBACK_SERVICES, type CatalogCity, type CatalogService } from '../core/models';
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
      <select class="select" [(ngModel)]="cityId" aria-label="المدينة">
        <option value="">كل المدن</option>
        @for (city of cities; track city.id) {
          <option [value]="city.id">{{ city.nameAr }}</option>
        }
      </select>
    </div>
    <div class="filters">
      <button class="chip" type="button" [class.active]="!activeGroup" (click)="activeGroup = ''">كل الخدمات</button>
      @for (group of groups; track group) {
        <button class="chip" type="button" [class.active]="activeGroup === group" (click)="activeGroup = group">{{ group }}</button>
      }
    </div>
    @if (filtered.length === 0) {
      <p class="page-empty">لا توجد نتائج مطابقة.</p>
    } @else {
      <div class="grid four">
        @for (service of filtered; track service.id) {
          <article class="card hover service-card">
            <app-favorite-btn class="service-fav" targetType="SERVICE" [targetId]="service.id" />
            <button class="service-open" type="button" (click)="open(service)">
              <div class="service-art">
                <img src="/hero.png" alt="" />
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
  cityId = '';
  activeGroup = '';
  cities: CatalogCity[] = [];
  services: CatalogService[] = [];
  readonly groups = ['الشعر', 'المكياج', 'العناية', 'المناسبات'];

  get filtered(): CatalogService[] {
    const q = this.query.trim();
    return this.services.filter((service) => {
      const matchesQuery = !q || service.nameAr.includes(q) || service.nameEn.toLowerCase().includes(q.toLowerCase());
      const matchesGroup = !this.activeGroup || this.groupOf(service) === this.activeGroup;
      return matchesQuery && matchesGroup;
    });
  }

  ngOnInit(): void {
    this.shell.set('تصفّح الخدمات', 'اختاري الخدمة والمدينة للوصول إلى النتائج المناسبة');
    this.cityId = this.session.user()?.city?.id ?? '';
    this.api.cities().subscribe({ next: (cities) => (this.cities = cities) });
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

  open(service: CatalogService): void {
    void this.router.navigate(['/c/providers'], {
      queryParams: { serviceId: service.id, cityId: this.cityId || undefined },
    });
  }

  serviceDesc(service: CatalogService): string {
    const fallback = FALLBACK_SERVICES.find((item) => item.code === service.code || item.nameAr === service.nameAr);
    return fallback?.desc ?? 'اكتشفي صانعات الجمال لهذه الخدمة';
  }

  private groupOf(service: CatalogService): string {
    const text = `${service.nameAr} ${service.code}`;
    if (text.includes('شعر') || text.includes('hair')) return 'الشعر';
    if (text.includes('مكياج') || text.includes('makeup') || text.includes('حواجب')) return 'المكياج';
    if (text.includes('عناية') || text.includes('بشرة') || text.includes('جسم') || text.includes('أظافر')) return 'العناية';
    return 'المناسبات';
  }
}
