import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage, displayPhone } from '../core/phone';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-otp',
  imports: [RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box" (submit)="submit($event)">
        <a routerLink="/login" class="back-link">{{ locale.t('auth.otp.back') }}</a>
        <span class="eyebrow">{{ locale.t('auth.otp.eyebrow') }}</span>
        <h1>{{ locale.t('auth.otp.title') }}</h1>
        <p class="sub">
          {{ locale.t('auth.otp.sent') }}
          <b dir="ltr">{{ phoneLabel }}</b>
        </p>
        <div class="otp">
          @for (digit of digits; track $index) {
            <input
              maxlength="1"
              inputmode="numeric"
              [attr.aria-label]="locale.t('auth.otp.digit') + ' ' + ($index + 1)"
              [value]="digit"
              (input)="onInput($event, $index)"
              (keydown)="onKey($event, $index)"
            />
          }
        </div>
        @if (errorText) {
          <p class="auth-error">{{ errorText }}</p>
        }
        <button class="btn primary full" style="margin-top:20px" type="submit" [disabled]="loading">
          {{ locale.t('auth.otp.submit') }}
          <app-icon name="arrow" />
        </button>
        <button class="btn soft full" style="margin-top:9px" type="button" (click)="resend()" [disabled]="seconds > 0 || loading">
          @if (seconds > 0) {
            {{ locale.t('auth.otp.resendIn') }} {{ timerLabel }}
          } @else {
            {{ locale.t('auth.otp.resend') }}
          }
        </button>
        <div class="auth-note">
          <b>✓</b>
          <span>{{ locale.t('auth.otp.note') }}</span>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class OtpComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);
  private interval: ReturnType<typeof setInterval> | null = null;

  digits = ['', '', '', '', '', ''];
  seconds = 120;
  loading = false;
  errorKey = '';
  errorRaw = '';
  purpose: 'REGISTER' | 'LOGIN_NEW_DEVICE' | 'RESET_PASSWORD' | 'FIRST_BROWSER' = 'REGISTER';

  get errorText(): string {
    return this.errorKey ? this.locale.t(this.errorKey) : this.errorRaw;
  }

  get phoneLabel(): string {
    return displayPhone(this.mobile);
  }

  get timerLabel(): string {
    const m = String(Math.floor(this.seconds / 60)).padStart(2, '0');
    const s = String(this.seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  get mobile(): string {
    return this.session.getDraft()?.mobile || this.session.getLoginMobile();
  }

  get code(): string {
    return this.digits.join('');
  }

  ngOnInit(): void {
    const purpose = this.route.snapshot.queryParamMap.get('purpose');
    if (
      purpose === 'REGISTER' ||
      purpose === 'LOGIN_NEW_DEVICE' ||
      purpose === 'RESET_PASSWORD' ||
      purpose === 'FIRST_BROWSER'
    ) {
      this.purpose = purpose;
    }
    if (!this.mobile) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.startTimer();
    if (this.purpose !== 'REGISTER') {
      this.api.sendOtp(this.mobile, this.purpose).subscribe({
        error: (err) => {
          const message = apiMessage(err, '');
          this.setError(this.locale.messageKey(message), message || this.locale.t('auth.otp.sendFailed'));
        },
      });
    }
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private setError(key: string | null, raw = ''): void {
    this.errorKey = key ?? '';
    this.errorRaw = key ? '' : raw;
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 1);
    this.digits[index] = value;
    input.value = value;
    if (value && index < this.digits.length - 1) {
      const next = input.parentElement?.children[index + 1] as HTMLInputElement | undefined;
      next?.focus();
    }
  }

  onKey(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prev = input.parentElement?.children[index - 1] as HTMLInputElement | undefined;
      prev?.focus();
    }
  }

  submit(event: Event): void {
    event.preventDefault();
    if (this.code.length < 6) {
      this.setError('auth.otp.incomplete');
      return;
    }
    this.loading = true;
    this.setError('');
    this.api.verifyOtp(this.mobile, this.purpose, this.code).subscribe({
      next: () => {
        const draft = this.session.getDraft();
        if (draft?.password) {
          this.api.login(this.mobile, draft.password).subscribe({
            next: (res) => {
              this.session.clearDraft();
              this.session.setSession(res.accessToken, res.user);
              this.toast.show(this.locale.t('auth.otp.success'));
              void this.router.navigateByUrl(this.session.homeFor(res.user.accountType));
            },
            error: (err) => {
              this.loading = false;
              const message = apiMessage(err, '');
              this.setError(this.locale.messageKey(message), message || this.locale.t('auth.otp.loginFailed'));
            },
          });
          return;
        }
        this.toast.show(this.locale.t('auth.otp.loginNext'));
        void this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.loading = false;
        const message = apiMessage(err, '');
        this.setError(this.locale.messageKey(message), message || this.locale.t('auth.otp.wrong'));
      },
    });
  }

  resend(): void {
    this.api.sendOtp(this.mobile, this.purpose).subscribe({
      next: () => {
        this.seconds = 120;
        this.startTimer();
        this.toast.show(this.locale.t('auth.otp.resent'));
      },
      error: (err) => this.toast.show(this.locale.t(this.locale.messageKey(apiMessage(err, '')) ?? 'auth.otp.resendFailed')),
    });
  }

  private startTimer(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = setInterval(() => {
      if (this.seconds > 0) {
        this.seconds -= 1;
      }
    }, 1000);
  }
}
