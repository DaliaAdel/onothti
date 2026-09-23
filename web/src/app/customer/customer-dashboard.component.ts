import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
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
        <span class="eyebrow">{{ locale.t('c.hero.eyebrow') }}</span>
        <h2>{{ locale.t('c.hero.title') }}</h2>
        <p>{{ locale.t('c.hero.text') }}</p>
        <div class="hero-actions">
          <a class="btn primary" routerLink="/c/services">{{ locale.t('c.hero.services') }} <app-icon name="arrow" /></a>
          <a class="btn ghost" routerLink="/c/account">{{ locale.t('c.hero.account') }}</a>
        </div>
      </div>
      <img class="hero-art" src="/hero.png" alt="" />
    </section>

    <div class="section-head">
      <div>
        <h2>{{ locale.t('c.services.title') }}</h2>
        <p>{{ locale.t('c.services.sub') }}</p>
      </div>
      <a class="text-link" routerLink="/c/services">{{ locale.t('c.services.all') }}</a>
    </div>
    <div class="grid four">
      @for (service of previewServices; track service.id) {
        <a class="card hover service-card" [routerLink]="['/c/providers']" [queryParams]="{ serviceId: service.id }">
          <div class="service-art">
            <img src="/hero.png" alt="" />
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
            <div class="provider-photo">{{ provider.displayName.slice(0, 1) }}</div>
            <div>
              <h3>{{ provider.displayName }}</h3>
              <p>{{ serviceLine(provider) }} · {{ locale.localizedName(provider.city, locale.t('c.country')) }}</p>
              <div class="rating">★ {{ provider.ratingAvg ?? '—' }} · {{ locale.t('c.active') }}</div>
            </div>
            <a class="btn ghost" [routerLink]="['/c/providers', provider.id]">{{ locale.t('c.view') }}</a>
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
  readonly locale = inject(LocaleService);

  constructor() {
    effect(() => {
      this.locale.lang();
      this.shell.set(this.locale.t('c.dash.title'), this.locale.t('c.dash.subtitle'));
    });
  }

  services: CatalogService[] = [];
  providers: ProviderCard[] = [];

  get previewServices(): CatalogService[] {
    return this.services.slice(0, 4);
  }

  ngOnInit(): void {
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
    if (this.locale.lang() === 'en') {
      return fallback?.descEn ?? this.locale.t('c.serviceFallback');
    }
    return fallback?.desc ?? this.locale.t('c.serviceFallback');
  }

  serviceLine(provider: ProviderCard): string {
    return this.locale.localizedName(provider.services?.[0], this.locale.t('c.beauty'));
  }
}
