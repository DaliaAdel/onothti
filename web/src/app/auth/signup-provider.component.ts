import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { CatalogCity, CatalogService } from '../core/models';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-signup-provider',
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout
      variant="provider"
      visualIcon="spark"
      [visualTitle]="locale.t('auth.provider.visualTitle')"
      [visualSub]="locale.t('auth.provider.visualSub')"
      [visualFeatures]="providerFeatures"
    >
      <form class="auth-box signup-details" (ngSubmit)="submit()">
        <a routerLink="/signup/type" class="back-link">{{ locale.t('auth.customer.back') }}</a>
        <span class="eyebrow">{{ locale.t('auth.provider.eyebrow') }}</span>
        <h1>{{ locale.t('auth.provider.title') }}</h1>
        <p class="sub">{{ locale.t('auth.provider.sub') }}</p>
        <div class="form-grid">
          <div class="field">
            <label>{{ locale.t('auth.fullName') }}</label>
            <input class="input" name="name" [(ngModel)]="displayName" required [placeholder]="locale.t('auth.fullNamePlaceholder')" />
          </div>
          <div class="field">
            <label>{{ locale.t('auth.displayName') }}</label>
            <input class="input" name="display" [(ngModel)]="displayName" required [placeholder]="locale.t('auth.proNamePlaceholder')" />
          </div>
          <div class="field">
            <label>{{ locale.t('auth.city') }}</label>
            <select class="input" name="city" [(ngModel)]="cityId">
              <option value="">{{ locale.t('auth.cityPlaceholder') }}</option>
              @for (city of cities; track city.id) {
                <option [value]="city.id">{{ locale.localizedName(city) }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>{{ locale.t('auth.mainService') }}</label>
            <select class="input" name="service" [(ngModel)]="serviceId">
              <option value="">{{ locale.t('auth.servicePlaceholder') }}</option>
              @for (service of services; track service.id) {
                <option [value]="service.id">{{ locale.localizedName(service) }}</option>
              }
            </select>
          </div>
          <div class="field full">
            <label>{{ locale.t('auth.bio') }}</label>
            <textarea class="input" name="bio" [(ngModel)]="bio" [placeholder]="locale.t('auth.bioPlaceholder')"></textarea>
          </div>
        </div>
        @if (errorText) {
          <p class="auth-error">
            {{ errorText }}
            @if (phoneTaken) {
              <a routerLink="/signup">{{ locale.t('auth.reviewPhone') }}</a>
            }
          </p>
        }
        <button class="btn primary full" style="margin-top:20px" type="submit" [disabled]="loading">
          {{ locale.t('auth.provider.submit') }}
          <app-icon name="arrow" />
        </button>
        <div class="auth-note">
          <b>!</b>
          <span>{{ locale.t('auth.provider.note') }}</span>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class SignupProviderComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  displayName = '';
  cityId = '';
  serviceId = '';
  bio = '';
  cities: CatalogCity[] = [];
  services: CatalogService[] = [];
  loading = false;
  errorKey = '';
  errorRaw = '';
  phoneTaken = false;

  get providerFeatures(): string[] {
    return [this.locale.t('auth.provider.f1'), this.locale.t('auth.provider.f2'), this.locale.t('auth.provider.f3')];
  }

  get errorText(): string {
    return this.errorKey ? this.locale.t(this.errorKey) : this.errorRaw;
  }

  private setError(key: string | null, raw = ''): void {
    this.errorKey = key ?? '';
    this.errorRaw = key ? '' : raw;
  }

  ngOnInit(): void {
    const draft = this.session.getDraft();
    if (!draft || draft.accountType !== 'PROVIDER') {
      void this.router.navigateByUrl('/signup/type');
      return;
    }
    this.displayName = draft.displayName;
    this.api.cities().subscribe({ next: (cities) => (this.cities = cities) });
    this.api.services().subscribe({ next: (services) => (this.services = services) });
  }

  submit(): void {
    const draft = this.session.getDraft();
    if (!draft) {
      void this.router.navigateByUrl('/signup');
      return;
    }
    this.loading = true;
    this.setError('');
    this.phoneTaken = false;
    this.session.saveDraft({
      ...draft,
      displayName: this.displayName.trim(),
      cityId: this.cityId || undefined,
      bio: this.bio.trim() || undefined,
    });
    this.api
      .register({
        accountType: 'PROVIDER',
        displayName: this.displayName.trim(),
        mobile: draft.mobile,
        password: draft.password,
        email: draft.email,
      })
      .subscribe({
        next: () => {
          this.toast.show(this.locale.t('auth.registered'));
          void this.router.navigate(['/otp'], { queryParams: { purpose: 'REGISTER' } });
        },
        error: (err) => {
          this.loading = false;
          const message = apiMessage(err, '');
          this.phoneTaken = message.includes('رقم الجوال مسجل بالفعل');
          this.setError(this.locale.messageKey(message), message || this.locale.t('auth.registerFailed'));
        },
      });
  }
}
