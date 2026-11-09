import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { AccountType, CatalogRegion, CatalogService } from '../core/models';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-account-complete',
  imports: [FormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box signup-box" (ngSubmit)="submit()">
        <div class="signup-head">
          <a class="auth-back" routerLink="/login">{{ locale.t('auth.back') }}</a>
          <span class="auth-kicker">{{ isCustomer ? locale.t('role.customer') : locale.t('role.provider') }}</span>
          <h2>{{ locale.t('auth.complete.profile') }}</h2>
          <p class="muted">
            {{ isCustomer ? locale.t('auth.complete.customerHint') : locale.t('auth.complete.providerHint') }}
          </p>
        </div>
        <div class="signup-body">
          <div class="auth-grid">
            <div class="field">
              <label>{{ locale.t('auth.complete.name') }}</label>
              <input name="name" [(ngModel)]="displayName" [placeholder]="locale.t('auth.displayName')" />
            </div>
            <div class="field">
              <label>{{ locale.t('auth.complete.region') }}</label>
              <select name="region" [(ngModel)]="regionId" (ngModelChange)="onRegionChange()">
                <option value="">{{ locale.t('c.account.pickRegion') }}</option>
                @for (region of regions; track region.id) {
                  <option [value]="region.id">{{ locale.localizedName(region) }}</option>
                }
              </select>
            </div>
            @if (isCustomer) {
              <div class="field">
                <label>{{ locale.t('auth.complete.city') }}</label>
                <select name="city" [(ngModel)]="cityId" [disabled]="!regionId">
                  <option value="">{{ locale.t('c.account.pickCity') }}</option>
                  @for (city of cities; track city.id) {
                    <option [value]="city.id">{{ locale.localizedName(city) }}</option>
                  }
                </select>
              </div>
            } @else {
              <div class="field city-multi">
                <label>{{ locale.t('auth.complete.cities') }}</label>
                <small class="city-hint">{{ locale.t('auth.complete.citiesHint') }}</small>
                <div class="chips">
                  @if (!regionId) {
                    <span class="muted small">{{ locale.t('auth.complete.citiesPickRegion') }}</span>
                  }
                  @for (city of cities; track city.id) {
                    <button class="chip" type="button" [class.active]="isCitySelected(city.id)" (click)="toggleCity(city.id)">
                      {{ locale.localizedName(city) }}
                    </button>
                  }
                </div>
              </div>
            }
            <div class="field auth-email">
              <label>{{ locale.t('auth.complete.email') }}</label>
              <input type="email" dir="ltr" name="email" [(ngModel)]="email" placeholder="name@example.com" />
            </div>
          </div>
          @if (!isCustomer) {
            <h3>{{ locale.t('auth.complete.services') }}</h3>
            <div class="chips disabled-services">
              @for (service of previewServices; track service.id) {
                <button class="chip" type="button" disabled>{{ locale.localizedName(service) }}</button>
              }
            </div>
            <div class="subscription-note">
              <b>{{ locale.t('auth.complete.servicesLater') }}</b>
              <span>{{ locale.t('auth.complete.servicesLaterText') }}</span>
            </div>
          }
        </div>
        <div class="signup-foot">
          <label class="terms-row">
            <input type="checkbox" name="acceptTerms" [(ngModel)]="acceptTerms" />
            <span>
              {{ locale.t('auth.terms') }}
              <a routerLink="/legal/terms" [queryParams]="{ audience: accountType }">{{ locale.t('auth.termsLink') }}</a>
              {{ locale.t('auth.and') }}
              <a routerLink="/legal/policies" [queryParams]="{ audience: accountType }">{{ locale.t('auth.privacyLink') }}</a>
            </span>
          </label>
          @if (errorText) {
            <p class="auth-error">{{ errorText }}</p>
          }
          <button class="btn primary auth-submit" type="submit" [disabled]="loading">{{ locale.t('auth.complete.saveEnter') }}</button>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class AccountCompleteComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  displayName = '';
  regionId = '';
  cityId = '';
  cityIds: string[] = [];
  email = '';
  acceptTerms = false;
  accountType: AccountType = 'PROVIDER';
  regions: CatalogRegion[] = [];
  previewServices: CatalogService[] = [];
  loading = false;
  errorKey = '';
  errorRaw = '';

  get isCustomer(): boolean {
    return this.accountType === 'CUSTOMER';
  }

  get cities() {
    return this.regions.find((region) => region.id === this.regionId)?.cities ?? [];
  }

  get errorText(): string {
    return this.errorKey ? this.locale.t(this.errorKey) : this.errorRaw;
  }

  ngOnInit(): void {
    const draft = this.session.getDraft();
    if (!draft?.mobile || !draft.otpCode) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.accountType = draft.accountType === 'CUSTOMER' ? 'CUSTOMER' : 'PROVIDER';
    this.displayName = draft.displayName || '';
    this.cityIds = draft.cityIds?.length ? [...draft.cityIds] : draft.cityId ? [draft.cityId] : [];
    this.cityId = this.cityIds[0] || draft.cityId || '';
    this.email = draft.email || '';
    this.api.regions().subscribe({
      next: (regions) => {
        this.regions = regions;
        this.syncRegionFromCities();
      },
    });
    if (!this.isCustomer) {
      this.api.services().subscribe({ next: (services) => (this.previewServices = services.slice(0, 8)) });
    }
  }

  onRegionChange(): void {
    const allowed = new Set(this.cities.map((city) => city.id));
    this.cityIds = this.cityIds.filter((id) => allowed.has(id));
    if (this.isCustomer) {
      if (!allowed.has(this.cityId)) {
        this.cityId = '';
      }
      return;
    }
    this.cityId = this.cityIds[0] ?? '';
  }

  isCitySelected(id: string): boolean {
    return this.cityIds.includes(id);
  }

  toggleCity(id: string): void {
    if (this.cityIds.includes(id)) {
      this.cityIds = this.cityIds.filter((cityId) => cityId !== id);
    } else {
      this.cityIds = [...this.cityIds, id];
    }
    this.cityId = this.cityIds[0] ?? '';
  }

  private syncRegionFromCities(): void {
    const selectedId = this.cityIds[0] || this.cityId;
    if (!selectedId || this.regionId) {
      return;
    }
    this.regionId =
      this.regions.find((region) => region.cities.some((city) => city.id === selectedId))?.id ?? '';
  }

  submit(): void {
    const draft = this.session.getDraft();
    if (!draft?.mobile || !draft.otpCode) {
      void this.router.navigateByUrl('/login');
      return;
    }
    if (this.displayName.trim().length < 2) {
      this.errorKey = 'auth.signup.nameShort';
      return;
    }
    if (!this.regionId) {
      this.errorKey = this.isCustomer ? 'auth.complete.needCityCustomer' : 'auth.complete.needCityProvider';
      this.errorRaw = '';
      return;
    }
    const cityIds = this.isCustomer ? (this.cityId ? [this.cityId] : []) : this.cityIds;
    if (!cityIds.length) {
      this.errorKey = 'auth.complete.cityRequired';
      return;
    }
    if (!this.acceptTerms) {
      this.errorKey = 'auth.complete.needLegal';
      this.errorRaw = '';
      return;
    }
    this.loading = true;
    this.errorKey = '';
    this.errorRaw = '';
    this.api
      .completePhone({
        mobile: draft.mobile,
        code: draft.otpCode,
        accountType: this.accountType === 'CUSTOMER' ? 'CUSTOMER' : 'PROVIDER',
        displayName: this.displayName.trim(),
        cityId: cityIds[0],
        cityIds,
        email: this.email.trim() || undefined,
        acceptTerms: true,
      })
      .subscribe({
        next: (res) => {
          this.session.clearDraft();
          this.session.setSession(res.accessToken, res.user);
          this.toast.show(this.locale.t('auth.complete.welcome'));
          void this.router.navigateByUrl(this.session.homeFor(res.user.accountType));
        },
        error: (err) => {
          this.loading = false;
          const message = apiMessage(err, '');
          this.errorKey = this.locale.messageKey(message) ?? '';
          this.errorRaw = this.errorKey ? '' : message || this.locale.t('auth.registerFailed');
        },
      });
  }
}
