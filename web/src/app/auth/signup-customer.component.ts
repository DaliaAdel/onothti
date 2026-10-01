import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { CatalogCity } from '../core/models';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-signup-customer',
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout
      variant="customer"
      visualIcon="search"
      [visualTitle]="locale.t('auth.customer.visualTitle')"
      [visualSub]="locale.t('auth.customer.visualSub')"
      [visualFeatures]="customerFeatures"
    >
      <form class="auth-box signup-details" (ngSubmit)="submit()">
        <a routerLink="/signup/type" class="back-link">{{ locale.t('auth.customer.back') }}</a>
        <span class="eyebrow">{{ locale.t('auth.customer.eyebrow') }}</span>
        <h1>{{ locale.t('auth.customer.title') }}</h1>
        <p class="sub">{{ locale.t('auth.customer.sub') }}</p>
        <div class="form-grid">
          <div class="field">
            <label>{{ locale.t('auth.name') }}</label>
            <input class="input" name="name" [(ngModel)]="displayName" required [placeholder]="locale.t('auth.namePlaceholder')" />
          </div>
          <div class="field">
            <label>{{ locale.t('auth.displayName') }}</label>
            <input class="input" name="display" [(ngModel)]="displayName" required [placeholder]="locale.t('auth.displayPlaceholder')" />
          </div>
          <div class="field full">
            <label>{{ locale.t('auth.city') }}</label>
            <select class="input" name="city" [(ngModel)]="cityId">
              <option value="">{{ locale.t('auth.cityPlaceholder') }}</option>
              @for (city of cities; track city.id) {
                <option [value]="city.id">{{ locale.localizedName(city) }}</option>
              }
            </select>
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
          {{ locale.t('auth.customer.submit') }}
          <app-icon name="arrow" />
        </button>
        <div class="auth-note">
          <b>✓</b>
          <span>{{ locale.t('auth.customer.note') }}</span>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class SignupCustomerComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  displayName = '';
  cityId = '';
  cities: CatalogCity[] = [];
  loading = false;
  errorKey = '';
  errorRaw = '';
  phoneTaken = false;

  get customerFeatures(): string[] {
    return [this.locale.t('auth.customer.f1'), this.locale.t('auth.customer.f2'), this.locale.t('auth.customer.f3')];
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
    if (!draft || draft.accountType !== 'CUSTOMER') {
      void this.router.navigateByUrl('/signup/type');
      return;
    }
    this.displayName = draft.displayName;
    this.api.cities().subscribe({
      next: (cities) => (this.cities = cities),
      error: () => {
        this.cities = [];
      },
    });
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
    this.session.saveDraft({ ...draft, displayName: this.displayName.trim(), cityId: this.cityId || undefined });
    this.api
      .register({
        accountType: 'CUSTOMER',
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
