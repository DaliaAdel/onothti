import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
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
        <a routerLink="/login" class="back-link">→ العودة لتعديل الرقم</a>
        <span class="eyebrow">خطوة تحقق واحدة</span>
        <h1>أدخلي رمز التحقق</h1>
        <p class="sub">
          أرسلنا رمزًا إلى
          <b dir="ltr">{{ phoneLabel }}</b>
        </p>
        <div class="otp">
          @for (digit of digits; track $index) {
            <input
              maxlength="1"
              inputmode="numeric"
              [attr.aria-label]="'الرقم ' + ($index + 1)"
              [value]="digit"
              (input)="onInput($event, $index)"
              (keydown)="onKey($event, $index)"
            />
          }
        </div>
        @if (error) {
          <p class="auth-error">{{ error }}</p>
        }
        <button class="btn primary full" style="margin-top:20px" type="submit" [disabled]="loading">
          تحقق ومتابعة
          <app-icon name="arrow" />
        </button>
        <button class="btn soft full" style="margin-top:9px" type="button" (click)="resend()" [disabled]="seconds > 0 || loading">
          @if (seconds > 0) {
            إعادة الإرسال بعد {{ timerLabel }}
          } @else {
            إعادة إرسال الرمز
          }
        </button>
        <div class="auth-note">
          <b>✓</b>
          <span>الرمز مؤقت لحماية بياناتك. في بيئة التطوير الرمز هو 123456.</span>
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
  private interval: ReturnType<typeof setInterval> | null = null;

  digits = ['', '', '', '', '', ''];
  seconds = 120;
  loading = false;
  error = '';
  purpose: 'REGISTER' | 'LOGIN_NEW_DEVICE' | 'RESET_PASSWORD' | 'FIRST_BROWSER' = 'REGISTER';

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
          this.error = apiMessage(err, 'تعذر إرسال الرمز');
        },
      });
    }
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
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
      this.error = 'أكملي رمز التحقق أولًا';
      return;
    }
    this.loading = true;
    this.error = '';
    this.api.verifyOtp(this.mobile, this.purpose, this.code).subscribe({
      next: () => {
        const draft = this.session.getDraft();
        if (draft?.password) {
          this.api.login(this.mobile, draft.password).subscribe({
            next: (res) => {
              this.session.clearDraft();
              this.session.setSession(res.accessToken, res.user);
              this.toast.show('تم التحقق بنجاح');
              void this.router.navigateByUrl(this.session.homeFor(res.user.accountType));
            },
            error: (err) => {
              this.loading = false;
              this.error = apiMessage(err, 'تم التحقق، لكن تعذر الدخول');
            },
          });
          return;
        }
        this.toast.show('تم التحقق بنجاح، سجّلي دخولكِ');
        void this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.loading = false;
        this.error = apiMessage(err, 'رمز التحقق غير صحيح');
      },
    });
  }

  resend(): void {
    this.api.sendOtp(this.mobile, this.purpose).subscribe({
      next: () => {
        this.seconds = 120;
        this.startTimer();
        this.toast.show('أُعيد إرسال الرمز');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إعادة الإرسال')),
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
