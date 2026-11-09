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
        <h1>{{ locale.t('p.st.title') }}</h1>
        <p>{{ locale.t('p.st.sub') }}</p>
      </div>
    </div>
    @if (!proofs.length) {
      <div class="card empty">
        <div class="upload-icon">◇</div>
        <h3>{{ locale.t('p.st.emptyTitle') }}</h3>
        <p class="muted small">{{ locale.t('p.st.emptyText') }}</p>
        <a class="btn primary" routerLink="/p/payment">{{ locale.t('p.st.send') }}</a>
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
          <span class="small muted">{{ isLive ? locale.t('p.st.left') : locale.t('p.st.duration') }}</span>
          <strong>{{ remainingDays }}</strong>
          <b>{{ locale.t('p.st.days') }}</b>
          <div class="usage-track"><i [style.width.%]="remainingPercent"></i></div>
          <small class="muted">{{ isLive ? locale.t('p.st.ends') : endVerb }} {{ formatDate(selected.subscription.endAt) }}</small>
        </div>
      </div>
      <div class="card payment-details">
        <h3>{{ locale.t('p.st.details') }}</h3>
        <div class="summary-line"><span>{{ locale.t('p.st.orderNo') }}</span><b dir="ltr">{{ requestNo(selected) }}</b></div>
        <div class="summary-line"><span>{{ locale.t('p.st.package') }}</span><b>{{ packageLabel(selected.subscription.package) }}</b></div>
        <div class="summary-line"><span>{{ locale.t('p.st.amount') }}</span><b>{{ selected.amount }} {{ locale.t('ui.sar') }}</b></div>
        <div class="summary-line"><span>{{ locale.t('p.st.subStatus') }}</span><b [class.approved-text]="isLive" [class.inactive-text]="!isLive">{{ isLive ? locale.t('p.st.live') : locale.t('p.st.notLive') }}</b></div>
        <div class="summary-line"><span>{{ locale.t('p.st.transferStatus') }}</span><b [class.approved-text]="approved" [class.inactive-text]="rejected" [class.warning-text]="pending">{{ transferLabel }}</b></div>
        <div class="summary-line"><span>{{ locale.t('p.st.start') }}</span><b>{{ formatDate(selected.subscription.startAt) }}</b></div>
        <div class="summary-line"><span>{{ locale.t('p.st.end') }}</span><b>{{ formatDate(selected.subscription.endAt) }}</b></div>
        <div class="payment-flow">
          <span class="done">{{ locale.t('p.st.proofSent') }}</span>
          <i></i>
          <span [class.done]="reviewed">{{ reviewed ? locale.t('p.st.reviewed') : locale.t('p.st.waitReview') }}</span>
          <i></i>
          <span [class.done]="isLive">{{ isLive ? locale.t('p.st.activated') : locale.t('p.st.notActivated') }}</span>
        </div>
      </div>
      <div class="section-title subscriptions-title">
        <div>
          <h3>{{ locale.t('p.st.prev') }}</h3>
          <p class="small muted">{{ locale.t('p.st.prevHint') }}</p>
        </div>
        <span class="subscriptions-count">{{ locale.tf('p.st.count', { n: proofs.length }) }}</span>
      </div>
      <div class="card previous-subscriptions payment-history-list">
        <div class="previous-subscriptions-head">
          <span>{{ locale.t('p.st.package') }}</span>
          <span>{{ locale.t('p.st.period') }}</span>
          <span>{{ locale.t('p.pay.amount') }}</span>
          <span>{{ locale.t('p.st.subStatus') }}</span>
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
            <b>{{ item.amount }} {{ locale.t('ui.sar') }}</b>
            <span class="status" [class.success]="isItemLive(item)" [class.ended]="!isItemLive(item)">{{ isItemLive(item) ? locale.t('p.st.live') : locale.t('p.st.notLive') }}</span>
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
    this.shell.set('p.payStatus');
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
      return this.locale.t('p.st.liveSub');
    }
    if (this.pending) {
      return this.locale.t('p.st.pending');
    }
    if (this.rejected) {
      return this.locale.t('p.st.rejected');
    }
    return this.locale.t('p.st.inactiveSub');
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
      return this.locale.t('p.st.msgLive');
    }
    if (this.pending) {
      return this.locale.t('p.st.msgPending');
    }
    if (this.rejected) {
      return this.locale.t('p.st.msgRejected');
    }
    return this.locale.t('p.st.msgEnded');
  }

  get hint(): string {
    if (this.isLive) {
      return this.locale.t('p.st.helpLive');
    }
    if (this.pending) {
      return this.locale.t('p.st.helpPending');
    }
    if (this.rejected) {
      return this.locale.t('p.st.helpRejected');
    }
    return this.locale.t('p.st.helpEnded');
  }

  get transferLabel(): string {
    if (this.approved) {
      return this.locale.t('p.st.xferOk');
    }
    if (this.rejected) {
      return this.locale.t('p.st.xferNo');
    }
    return this.locale.t('p.st.xferWait');
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
    return this.remainingDays > 0 ? this.locale.t('p.st.ends') : this.locale.t('p.st.ended');
  }

  requestNo(item: PaymentProof): string {
    return `PAY-${item.id.replace(/-/g, '').slice(-4).toUpperCase()}`;
  }

  period(item: PaymentProof): string {
    return `${this.formatDate(item.subscription.startAt)} – ${this.formatDate(item.subscription.endAt)}`;
  }

  packageLabel(pkg: PaymentProof['subscription']['package']): string {
    const name = this.locale.localizedName(pkg);
    const hasPrefix =
      this.locale.lang() === 'ar' ? name.includes('باقة') : name.toLowerCase().includes('package');
    return hasPrefix ? name : this.locale.tf('p.st.pkgPrefix', { name });
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }
    return new Intl.DateTimeFormat(this.locale.dateTag(), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  }

  private startDate(item: PaymentProof): Date {
    return new Date(item.subscription.startAt || item.createdAt);
  }

  private endDate(item: PaymentProof): Date {
    return new Date(item.subscription.endAt || item.createdAt);
  }
}
