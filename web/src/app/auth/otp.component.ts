import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage, displayPhone } from '../core/phone';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-otp',
  imports: [RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <form class="auth-box" (submit)="submit($event)">
        <a class="auth-back" [routerLink]="backLink">← رجوع</a>
        <span class="auth-kicker">التحقق من رقم الجوال</span>
        <h2>أدخلي رمز التحقق</h2>
        <p class="muted">أرسلنا رمزًا من 6 أرقام إلى <b dir="ltr">{{ phoneLabel }}</b></p>
        <div class="otp-fields" dir="ltr">
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
        <button class="btn primary auth-submit" type="submit" [disabled]="loading">تأكيد ومتابعة</button>
        <button class="btn ghost auth-submit" style="margin-top:9px" type="button" (click)="resend()" [disabled]="seconds > 0 || loading">
          @if (seconds > 0) {
            {{ locale.t('auth.otp.resendIn') }} {{ timerLabel }}
          } @else {
            {{ locale.t('auth.otp.resend') }}
          }
        </button>
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
  purpose: 'REGISTER' | 'LOGIN' | 'LOGIN_NEW_DEVICE' | 'RESET_PASSWORD' | 'FIRST_BROWSER' = 'LOGIN';

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

  get backLink(): string {
    return this.purpose === 'REGISTER' ? '/signup/phone' : '/login/phone';
  }

  ngOnInit(): void {
    const purpose = this.route.snapshot.queryParamMap.get('purpose');
    if (
      purpose === 'REGISTER' ||
      purpose === 'LOGIN' ||
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
    this.api.verifyPhone(this.mobile, this.code).subscribe({
      next: (res) => {
        if (res.accessToken && res.user) {
          this.session.clearDraft();
          this.session.setSession(res.accessToken, res.user);
          this.toast.show(this.locale.t('auth.otp.success'));
          void this.router.navigateByUrl(this.session.homeFor(res.user.accountType));
          return;
        }
        const draft = this.session.getDraft();
        this.session.saveDraft({
          displayName: draft?.displayName ?? '',
          mobile: this.mobile,
          otpCode: this.code,
          needsProfile: true,
        });
        this.toast.show(this.locale.t('auth.otp.success'));
        void this.router.navigateByUrl('/complete');
      },
      error: (err) => {
        this.loading = false;
        const message = apiMessage(err, '');
        this.setError(this.locale.messageKey(message), message || this.locale.t('auth.otp.wrong'));
      },
    });
  }

  resend(): void {
    this.api.startPhone(this.mobile).subscribe({
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
