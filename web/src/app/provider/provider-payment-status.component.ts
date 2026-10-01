import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import type { PaymentProof } from '../core/models';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-payment-status',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>حالة الدفع والاشتراك</h1>
        <p>تفاصيل اعتماد التحويل وسجل الاشتراكات</p>
      </div>
    </div>
    @if (!proofs.length) {
      <div class="card empty">
        <div class="upload-icon">◇</div>
        <h3>لا يوجد إثبات مرسل بعد</h3>
        <p class="muted small">أرسلي إثبات التحويل لمتابعة حالة المراجعة هنا.</p>
        <a class="btn primary" routerLink="/p/payment">إرسال إثبات التحويل</a>
      </div>
    } @else if (selected) {
      <div class="payment-approved-grid">
        <div class="card payment-approved" [class.inactive-subscription]="!isLive">
          <div class="approved-icon">{{ headerIcon }}</div>
          <div>
            <span class="status" [class.success]="isLive" [class.ended]="!isLive && approved" [class.warning]="pending" [class.error]="rejected">{{ headerBadge }}</span>
            <h2>{{ heading }}</h2>
            <p class="muted small">{{ hint }}</p>
          </div>
        </div>
        <div class="card remaining-days" [class.inactive-subscription]="!isLive">
          <span class="small muted">{{ isLive ? 'المدة المتبقية' : 'حالة المدة' }}</span>
          <strong>{{ remainingDays }}</strong>
          <b>يومًا</b>
          <div class="usage-track"><i [style.width.%]="remainingPercent"></i></div>
          <small class="muted">{{ isLive ? 'ينتهي الاشتراك في' : endVerb }} {{ formatDate(selected.subscription.endAt) }}</small>
        </div>
      </div>
      <div class="card payment-details">
        <h3>تفاصيل العملية</h3>
        <div class="summary-line"><span>رقم الطلب</span><b dir="ltr">{{ requestNo(selected) }}</b></div>
        <div class="summary-line"><span>الباقة</span><b>{{ packageLabel(selected.subscription.package) }}</b></div>
        <div class="summary-line"><span>قيمة التحويل</span><b>{{ selected.amount }} ر.س</b></div>
        <div class="summary-line"><span>حالة الاشتراك</span><b [class.approved-text]="isLive" [class.inactive-text]="!isLive">{{ isLive ? 'نشط' : 'غير نشط' }}</b></div>
        <div class="summary-line"><span>حالة التحويل</span><b [class.approved-text]="approved" [class.inactive-text]="rejected" [class.warning-text]="pending">{{ transferLabel }}</b></div>
        <div class="summary-line"><span>تاريخ التفعيل</span><b>{{ formatDate(selected.subscription.startAt) }}</b></div>
        <div class="summary-line"><span>تاريخ الانتهاء</span><b>{{ formatDate(selected.subscription.endAt) }}</b></div>
        <div class="payment-flow">
          <span class="done">✓ تم إرسال الإثبات</span>
          <i></i>
          <span [class.done]="reviewed">{{ reviewed ? '✓ تمت المراجعة' : 'بانتظار المراجعة' }}</span>
          <i></i>
          <span [class.done]="isLive">{{ isLive ? '✓ تم تفعيل الحساب' : 'لم يُفعَّل الحساب' }}</span>
        </div>
      </div>
      <div class="section-title subscriptions-title">
        <div>
          <h3>الاشتراكات السابقة</h3>
          <p class="small muted">اضغطي على أي اشتراك لعرض حالة الدفع الخاصة به في نفس الشاشة</p>
        </div>
        <span class="subscriptions-count">{{ proofs.length }} اشتراكات</span>
      </div>
      <div class="card previous-subscriptions payment-history-list">
        <div class="previous-subscriptions-head">
          <span>الباقة</span>
          <span>فترة الاشتراك</span>
          <span>المبلغ</span>
          <span>الحالة</span>
        </div>
        @for (item of proofs; track item.id) {
          <button
            type="button"
            class="previous-subscription-row subscription-history-row"
            [class.selected-subscription-row]="item.id === selected.id"
            (click)="select(item)"
          >
            <div>
              <span class="package-history-icon">◇</span>
              <b>{{ packageLabel(item.subscription.package) }}</b>
            </div>
            <span>{{ period(item) }}</span>
            <b>{{ item.amount }} ر.س</b>
            <span class="status" [class.success]="isItemLive(item)" [class.ended]="!isItemLive(item)">{{ isItemLive(item) ? 'نشط' : 'غير نشط' }}</span>
          </button>
        }
      </div>
    }
  `,
})
export class ProviderPaymentStatusComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  proofs: PaymentProof[] = [];
  selected: PaymentProof | null = null;

  ngOnInit(): void {
    this.shell.set('حالة الدفع والاشتراك');
    this.api.providerSubscription().subscribe({
      next: (data) => {
        this.proofs = data.proofs ?? [];
        this.selected =
          this.proofs.find((item) => item.subscription.id === data.current?.id) ?? this.proofs[0] ?? null;
      },
    });
  }

  select(item: PaymentProof): void {
    this.selected = item;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isItemLive(item: PaymentProof): boolean {
    return item.subscription.status === 'ACTIVE' && this.endDate(item) >= new Date();
  }

  get isLive(): boolean {
    return this.selected ? this.isItemLive(this.selected) : false;
  }

  get approved(): boolean {
    return this.selected?.opsStatus === 'APPROVED' && this.selected?.financeStatus === 'APPROVED';
  }

  get rejected(): boolean {
    return this.selected?.opsStatus === 'REJECTED' || this.selected?.financeStatus === 'REJECTED';
  }

  get pending(): boolean {
    return !this.approved && !this.rejected;
  }

  get reviewed(): boolean {
    return !this.pending;
  }

  get headerBadge(): string {
    if (this.isLive) {
      return 'اشتراك نشط';
    }
    if (this.pending) {
      return 'قيد المراجعة';
    }
    if (this.rejected) {
      return 'غير مقبول';
    }
    return 'اشتراك غير نشط';
  }

  get headerIcon(): string {
    if (this.isLive) {
      return '✓';
    }
    if (this.pending) {
      return '⌛';
    }
    return '—';
  }

  get heading(): string {
    if (this.isLive) {
      return 'تمت مراجعة إثبات الدفع وتفعيل الحساب';
    }
    if (this.pending) {
      return 'الإثبات قيد المراجعة';
    }
    if (this.rejected) {
      return 'لم يتم اعتماد الإثبات';
    }
    return 'انتهت مدة هذا الاشتراك';
  }

  get hint(): string {
    if (this.isLive) {
      return 'تم اعتماد التحويل المالي والاشتراك مفعّل حاليًا ويمكنكِ استخدام جميع مزايا الباقة.';
    }
    if (this.pending) {
      return 'استلمنا إثبات التحويل الخاص بك. عادةً تستغرق المراجعة حتى 24 ساعة.';
    }
    if (this.rejected) {
      return 'راجعي بيانات التحويل وأرسلي إثباتًا جديدًا إذا لزم الأمر.';
    }
    return 'تمت مراجعة التحويل وتفعيل الباقة سابقًا، ثم أصبحت غير نشطة بعد انتهاء مدتها.';
  }

  get transferLabel(): string {
    if (this.approved) {
      return 'تمت المراجعة والقبول';
    }
    if (this.rejected) {
      return 'مرفوض';
    }
    return 'قيد المراجعة';
  }

  get remainingDays(): number {
    if (!this.selected) {
      return 0;
    }
    const ms = this.endDate(this.selected).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }

  get remainingPercent(): number {
    if (!this.selected) {
      return 0;
    }
    const start = this.startDate(this.selected).getTime();
    const end = this.endDate(this.selected).getTime();
    const total = Math.max(1, end - start);
    return Math.min(100, Math.round((Math.max(0, end - Date.now()) / total) * 100));
  }

  get endVerb(): string {
    return this.remainingDays > 0 ? 'ينتهي الاشتراك في' : 'انتهى الاشتراك في';
  }

  requestNo(item: PaymentProof): string {
    return `PAY-${item.id.replace(/-/g, '').slice(-4).toUpperCase()}`;
  }

  period(item: PaymentProof): string {
    return `${this.formatDate(item.subscription.startAt)} – ${this.formatDate(item.subscription.endAt)}`;
  }

  packageLabel(pkg: PaymentProof['subscription']['package']): string {
    const name = this.locale.localizedName(pkg);
    return name.includes('باقة') ? name : `الباقة ${name}`;
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  }

  private startDate(item: PaymentProof): Date {
    return new Date(item.subscription.startAt || item.createdAt);
  }

  private endDate(item: PaymentProof): Date {
    return new Date(item.subscription.endAt || item.createdAt);
  }
}
