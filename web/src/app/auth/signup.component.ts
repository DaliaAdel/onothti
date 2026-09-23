import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';
import { isSaudiMobile, toLocalPhone, toMobile } from '../core/phone';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box signup-details" (ngSubmit)="submit()">
        <a routerLink="/login" class="back-link">{{ locale.t('auth.signup.back') }}</a>
        <span class="eyebrow">{{ locale.t('auth.signup.eyebrow') }}</span>
        <h1>{{ locale.t('auth.signup.title') }}</h1>
        <p class="sub">{{ locale.t('auth.signup.sub') }}</p>
        <div class="form-grid">
          <div class="field full">
            <label>{{ locale.t('auth.name') }}</label>
            <input class="input" name="name" [(ngModel)]="displayName" required autocomplete="name" [placeholder]="locale.t('auth.namePlaceholder')" />
          </div>
          <div class="field full">
            <label>{{ locale.t('auth.mobile') }}</label>
            <div class="phone-field">
              <span>+966</span>
              <input
                name="phone"
                [ngModel]="phone"
                (ngModelChange)="phone = toLocalPhone($event)"
                (paste)="onPhonePaste($event)"
                required
                inputmode="numeric"
                maxlength="9"
                autocomplete="tel"
                placeholder="5X XXX XXXX"
              />
            </div>
          </div>
          <div class="field full">
            <label>{{ locale.t('auth.email') }} <span style="font-weight:400;color:var(--muted)">{{ locale.t('auth.optional') }}</span></label>
            <input class="input" name="email" type="email" [(ngModel)]="email" autocomplete="email" placeholder="name@example.com" dir="ltr" />
          </div>
          <div class="field">
            <label>{{ locale.t('auth.password') }}</label>
            <input class="input" name="password" type="password" [(ngModel)]="password" required minlength="8" autocomplete="new-password" [placeholder]="locale.t('auth.passwordHint')" />
          </div>
          <div class="field">
            <label>{{ locale.t('auth.confirm') }}</label>
            <input class="input" name="confirm" type="password" [(ngModel)]="confirm" required minlength="8" autocomplete="new-password" [placeholder]="locale.t('auth.confirmPlaceholder')" />
          </div>
        </div>
        <label class="terms-row">
          <input type="checkbox" name="terms" [(ngModel)]="terms" />
          {{ locale.t('auth.terms') }}
          <a routerLink="/legal/terms" [queryParams]="{ audience: 'CUSTOMER' }">{{ locale.t('auth.termsLink') }}</a>
          {{ locale.t('auth.and') }}
          <a routerLink="/legal/policies" [queryParams]="{ audience: 'CUSTOMER' }">{{ locale.t('auth.privacyLink') }}</a>.
        </label>
        @if (errorKey) {
          <p class="auth-error">{{ locale.t(errorKey) }}</p>
        }
        <button class="btn primary full" style="margin-top:16px" type="submit">
          {{ locale.t('auth.signup.submit') }}
          <app-icon name="arrow" />
        </button>
        <div class="auth-note step-row">
          <b>1</b><span>{{ locale.t('auth.step.details') }}</span>
          <b>2</b><span>{{ locale.t('auth.step.type') }}</span>
          <b>3</b><span>{{ locale.t('auth.step.otp') }}</span>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class SignupComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  displayName = '';
  phone = '';
  email = '';
  password = '';
  confirm = '';
  terms = false;
  errorKey = '';
  readonly toLocalPhone = toLocalPhone;

  ngOnInit(): void {
    const draft = this.session.getDraft();
    if (!draft) {
      return;
    }
    this.displayName = draft.displayName;
    this.phone = toLocalPhone(draft.mobile);
    this.email = draft.email ?? '';
    this.password = draft.password;
    this.confirm = draft.password;
    this.terms = true;
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.phone = toLocalPhone(event.clipboardData?.getData('text') ?? '');
  }

  submit(): void {
    const mobile = toMobile(this.phone);
    if (this.displayName.trim().length < 2) {
      this.errorKey = 'auth.signup.nameShort';
      return;
    }
    if (!isSaudiMobile(mobile)) {
      this.errorKey = 'auth.signup.phoneInvalid';
      return;
    }
    if (this.password.length < 8) {
      this.errorKey = 'auth.login.passwordShort';
      return;
    }
    if (this.password !== this.confirm) {
      this.errorKey = 'auth.signup.mismatch';
      return;
    }
    if (!this.terms) {
      this.errorKey = 'auth.signup.termsRequired';
      return;
    }
    this.session.saveDraft({
      displayName: this.displayName.trim(),
      mobile,
      email: this.email.trim() || undefined,
      password: this.password,
    });
    this.toast.show(this.locale.t('auth.signup.chooseType'));
    void this.router.navigateByUrl('/signup/type');
  }
}
