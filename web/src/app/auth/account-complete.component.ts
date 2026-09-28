import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { AccountType, CatalogCity } from '../core/models';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-account-complete',
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box signup-details" (ngSubmit)="submit()">
        <a routerLink="/login" class="back-link">{{ locale.t('auth.complete.back') }}</a>
        <span class="eyebrow">{{ locale.t('auth.complete.eyebrow') }}</span>
        <h1>{{ locale.t('auth.complete.title') }}</h1>
        <p class="sub">{{ locale.t('auth.complete.sub') }}</p>
        <div class="account-type-grid" style="margin-bottom:18px">
          <button class="account-type-card" type="button" [class.active]="accountType === 'CUSTOMER'" (click)="accountType = 'CUSTOMER'">
            <span class="type-icon"><app-icon name="search" /></span>
            <div>
              <h3>{{ locale.t('role.customer') }}</h3>
              <p>{{ locale.t('auth.type.customerText') }}</p>
            </div>
          </button>
          <button class="account-type-card" type="button" [class.active]="accountType === 'PROVIDER'" (click)="accountType = 'PROVIDER'">
            <span class="type-icon"><app-icon name="spark" /></span>
            <div>
              <h3>{{ locale.t('role.provider') }}</h3>
              <p>{{ locale.t('auth.type.providerText') }}</p>
            </div>
          </button>
        </div>
        <div class="form-grid">
          <div class="field full">
            <label>{{ locale.t('auth.name') }} *</label>
            <input class="input" name="name" [(ngModel)]="displayName" required [placeholder]="locale.t('auth.namePlaceholder')" />
          </div>
          <div class="field full">
            <label>{{ locale.t('auth.city') }} *</label>
            <select class="input" name="city" [(ngModel)]="cityId">
              <option value="">{{ locale.t('auth.cityPlaceholder') }}</option>
              @for (city of cities; track city.id) {
                <option [value]="city.id">{{ locale.localizedName(city) }}</option>
              }
            </select>
          </div>
        </div>
        @if (errorText) {
          <p class="auth-error">{{ errorText }}</p>
        }
        <button class="btn primary full" style="margin-top:20px" type="submit" [disabled]="loading">
          {{ locale.t('auth.complete.submit') }}
          <app-icon name="arrow" />
        </button>
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
  cityId = '';
  accountType: AccountType = 'CUSTOMER';
  cities: CatalogCity[] = [];
  loading = false;
  errorKey = '';
  errorRaw = '';

  get errorText(): string {
    return this.errorKey ? this.locale.t(this.errorKey) : this.errorRaw;
  }

  ngOnInit(): void {
    const draft = this.session.getDraft();
    if (!draft?.mobile || !draft.otpCode) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.displayName = draft.displayName || '';
    this.cityId = draft.cityId || '';
    this.accountType = draft.accountType ?? 'CUSTOMER';
    this.api.cities().subscribe({ next: (cities) => (this.cities = cities) });
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
    if (!this.cityId) {
      this.errorKey = 'auth.complete.cityRequired';
      return;
    }
    this.loading = true;
    this.errorKey = '';
    this.errorRaw = '';
    this.api
      .completePhone({
        mobile: draft.mobile,
        code: draft.otpCode,
        accountType: this.accountType,
        displayName: this.displayName.trim(),
        cityId: this.cityId,
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
