import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { CatalogCity, ProviderCard } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-list',
  imports: [RouterLink],
  template: `
    @if (!cityId) {
      <article class="card coming-card">
        <h2>اختاري مدينتك أولًا</h2>
        <p>نتائج البحث تعتمد على المدينة. حدّثي حسابك ثم عودي لعرض صانعات الجمال.</p>
        <a class="btn primary" routerLink="/c/account">تحديث المدينة</a>
      </article>
    } @else if (loading) {
      <p class="loading">جاري البحث عن صانعات الجمال...</p>
    } @else if (providers.length === 0) {
      <p class="page-empty">لا توجد نتائج مطابقة في هذه المدينة حاليًا.</p>
    } @else {
      <div class="grid two">
        @for (provider of providers; track provider.id) {
          <article class="card hover provider">
            <div class="provider-photo">{{ provider.displayName.slice(0, 1) }}</div>
            <div>
              <h3>{{ provider.displayName }}</h3>
              <p>{{ serviceLine(provider) }} · {{ provider.city?.nameAr || cityName }}</p>
              <div class="rating">★ {{ provider.ratingAvg ?? '—' }} · {{ provider.badge || 'حساب نشط ومعتمد' }}</div>
            </div>
            <a class="btn ghost" [routerLink]="['/c/providers', provider.id]">عرض الملف</a>
          </article>
        }
      </div>
    }
  `,
})
export class ProviderListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);

  cityId = '';
  cityName = '';
  serviceId = '';
  providers: ProviderCard[] = [];
  loading = false;

  ngOnInit(): void {
    this.shell.set('نتائج البحث', 'صانعات جمال يظهرن وفق المدينة والخدمة');
    this.route.queryParamMap.subscribe((params) => {
      this.cityId = params.get('cityId') || this.session.user()?.city?.id || '';
      this.serviceId = params.get('serviceId') || '';
      this.loadCitiesThenSearch();
    });
  }

  serviceLine(provider: ProviderCard): string {
    return provider.services?.[0]?.nameAr || 'خدمات تجميل';
  }

  private loadCitiesThenSearch(): void {
    if (!this.cityId) {
      return;
    }
    this.api.cities().subscribe({
      next: (cities: CatalogCity[]) => {
        this.cityName = cities.find((city) => city.id === this.cityId)?.nameAr ?? '';
      },
    });
    this.loading = true;
    this.api.search({ cityId: this.cityId, serviceId: this.serviceId || undefined, page: 1, pageSize: 20 }).subscribe({
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
