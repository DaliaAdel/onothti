import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { FALLBACK_SERVICES, type CatalogService, type ProviderCard } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-customer-dashboard',
  imports: [RouterLink, IconComponent],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">تجربة جمالية صُممت لكِ</span>
        <h2>جمالك أقرب إليكِ</h2>
        <p>اكتشفي صانعات الجمال في مدينتك، قارني التقييمات والأعمال، وتواصلي بثقة.</p>
        <div class="hero-actions">
          <a class="btn primary" routerLink="/c/services">استكشفي الخدمات <app-icon name="arrow" /></a>
          <a class="btn ghost" routerLink="/c/account">حسابي</a>
        </div>
      </div>
      <img class="hero-art" src="/hero.png" alt="" />
    </section>

    <div class="section-head">
      <div>
        <h2>ماذا تبحثين اليوم؟</h2>
        <p>خدمات مختارة لتصلي إلى إطلالتك بسرعة</p>
      </div>
      <a class="text-link" routerLink="/c/services">عرض جميع الخدمات ←</a>
    </div>
    <div class="grid four">
      @for (service of previewServices; track service.id) {
        <a class="card hover service-card" [routerLink]="['/c/providers']" [queryParams]="{ serviceId: service.id }">
          <div class="service-art">
            <img src="/hero.png" alt="" />
          </div>
          <div class="service-body">
            <h3>{{ service.nameAr }}</h3>
            <p>{{ serviceDesc(service) }}</p>
            <span class="arrow"><app-icon name="chev" /></span>
          </div>
        </a>
      }
    </div>

    <div class="section-head">
      <div>
        <h2>مختارات تناسبكِ</h2>
        <p>صانعات جمال موثوقات في مدينتك</p>
      </div>
      <a class="text-link" routerLink="/c/providers">عرض الكل ←</a>
    </div>
    @if (providers.length === 0) {
      <p class="page-empty">ابدئي باختيار مدينة من صفحة الحساب ثم تصفحي صانعات الجمال.</p>
    } @else {
      <div class="grid two">
        @for (provider of providers; track provider.id) {
          <article class="card hover provider">
            <div class="provider-photo">{{ provider.displayName.slice(0, 1) }}</div>
            <div>
              <h3>{{ provider.displayName }}</h3>
              <p>{{ serviceLine(provider) }} · {{ provider.city?.nameAr || 'المملكة' }}</p>
              <div class="rating">★ {{ provider.ratingAvg ?? '—' }} · حساب نشط ومعتمد</div>
            </div>
            <a class="btn ghost" [routerLink]="['/c/providers', provider.id]">عرض الملف</a>
          </article>
        }
      </div>
    }
  `,
})
export class CustomerDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);

  services: CatalogService[] = [];
  providers: ProviderCard[] = [];

  get previewServices(): CatalogService[] {
    return this.services.slice(0, 4);
  }

  ngOnInit(): void {
    this.shell.set('مساحتكِ للجمال', 'كل ما تحتاجينه للوصول إلى خدمتك المناسبة');
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

  serviceDesc(service: CatalogService): string {
    const fallback = FALLBACK_SERVICES.find((item) => item.code === service.code || item.nameAr === service.nameAr);
    return fallback?.desc ?? 'اكتشفي صانعات الجمال لهذه الخدمة';
  }

  serviceLine(provider: ProviderCard): string {
    return provider.services?.[0]?.nameAr || 'خدمات تجميل';
  }
}
