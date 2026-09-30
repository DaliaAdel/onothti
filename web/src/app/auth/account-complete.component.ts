import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { CatalogCity, CatalogService } from '../core/models';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-account-complete',
  imports: [FormsModule, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box signup-box" (ngSubmit)="submit()">
        <a class="auth-back" routerLink="/login">← رجوع</a>
        <span class="auth-kicker">الخبيرة</span>
        <h2>إكمال الملف الشخصي</h2>
        <p class="muted">الاسم والمدينة مطلوبان، ويمكنكِ استكمال باقي البيانات لاحقًا.</p>
        <div class="auth-grid">
          <div class="field">
            <label>الاسم *</label>
            <input name="name" [(ngModel)]="displayName" placeholder="اسم العرض" />
          </div>
          <div class="field">
            <label>المدينة *</label>
            <select name="city" [(ngModel)]="cityId">
              <option value="">اختاري المدينة</option>
              @for (city of cities; track city.id) {
                <option [value]="city.id">{{ locale.localizedName(city) }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>البريد الإلكتروني (اختياري)</label>
            <input type="email" dir="ltr" name="email" [(ngModel)]="email" placeholder="name@example.com" />
          </div>
        </div>
        <h3>الخدمات التي تقدمينها</h3>
        <div class="chips disabled-services">
          @for (service of previewServices; track service.id) {
            <button class="chip" type="button" disabled>{{ locale.localizedName(service) }}</button>
          }
        </div>
        <div class="subscription-note">
          <b>الخدمات متاحة بعد الاشتراك</b>
          <span>بعد الدخول اختاري باقة، وبعد اعتماد الدفع يمكنكِ إضافة خدماتك وألبومات أعمالك.</span>
        </div>
        @if (errorText) {
          <p class="auth-error">{{ errorText }}</p>
        }
        <button class="btn primary auth-submit" type="submit" [disabled]="loading">حفظ والدخول للرئيسية</button>
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
  email = '';
  cities: CatalogCity[] = [];
  previewServices: CatalogService[] = [];
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
    this.email = draft.email || '';
    this.api.cities().subscribe({ next: (cities) => (this.cities = cities) });
    this.api.services().subscribe({ next: (services) => (this.previewServices = services.slice(0, 8)) });
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
        accountType: 'PROVIDER',
        displayName: this.displayName.trim(),
        cityId: this.cityId,
        email: this.email.trim() || undefined,
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
