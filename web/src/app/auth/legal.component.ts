import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-legal',
  imports: [RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <div class="auth-box signup-details">
        <a [routerLink]="backLink" class="back-link">{{ locale.t('legal.back') }}</a>
        <span class="eyebrow">{{ audienceLabel }}</span>
        <h1>{{ title }}</h1>
        @if (loading) {
          <p class="loading">{{ locale.t('legal.loading') }}</p>
        } @else {
          <p class="legal-body">{{ body }}</p>
        }
      </div>
    </app-auth-layout>
  `,
})
export class LegalComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);
  readonly locale = inject(LocaleService);

  kind: 'TERMS' | 'POLICIES' | 'PRIVACY' | 'OTHER' = 'TERMS';
  audience: 'CUSTOMER' | 'PROVIDER' | 'STAFF' = 'CUSTOMER';
  titleAr = '';
  titleEn = '';
  bodyAr = '';
  bodyEn = '';
  loading = true;

  get audienceLabel(): string {
    if (this.audience === 'PROVIDER') {
      return this.locale.t('role.provider');
    }
    if (this.audience === 'STAFF') {
      return this.locale.t('legal.audience.staff');
    }
    return this.locale.t('role.customer');
  }

  get fallbackTitle(): string {
    if (this.kind === 'POLICIES') {
      return this.locale.t('legal.policies');
    }
    if (this.kind === 'PRIVACY') {
      return this.locale.t('auth.privacyLink');
    }
    if (this.kind === 'OTHER') {
      return this.locale.t('legal.page');
    }
    return this.locale.t('auth.termsLink');
  }

  get title(): string {
    return this.locale.lang() === 'en'
      ? this.titleEn || this.titleAr || this.fallbackTitle
      : this.titleAr || this.titleEn || this.fallbackTitle;
  }

  get body(): string {
    const text =
      this.locale.lang() === 'en'
        ? this.bodyEn || this.bodyAr
        : this.bodyAr || this.bodyEn;
    return text || this.locale.t('legal.unavailable');
  }

  get backLink(): string {
    if (!this.session.isLoggedIn) {
      return '/signup';
    }
    if (this.audience === 'STAFF') {
      return '/ops/about';
    }
    if (this.audience === 'PROVIDER') {
      return '/p/about';
    }
    return '/c/about';
  }

  ngOnInit(): void {
    const dataKind = String(this.route.snapshot.data['kind'] || 'terms');
    this.kind =
      dataKind === 'policies'
        ? 'POLICIES'
        : dataKind === 'privacy'
          ? 'PRIVACY'
          : dataKind === 'other'
            ? 'OTHER'
            : 'TERMS';
    const audience = this.route.snapshot.queryParamMap.get('audience');
    this.audience = audience === 'PROVIDER' || audience === 'STAFF' ? audience : 'CUSTOMER';
    this.api.legalPage(this.kind, this.audience).subscribe({
      next: (page) => {
        this.titleAr = page.titleAr || '';
        this.titleEn = page.titleEn || '';
        this.bodyAr = page.bodyAr || page.contentAr || '';
        this.bodyEn = page.bodyEn || '';
        this.loading = false;
      },
      error: () => {
        this.bodyAr = this.locale.t('legal.fail');
        this.bodyEn = this.locale.t('legal.fail');
        this.loading = false;
      },
    });
  }
}
