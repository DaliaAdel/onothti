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
        <h1>حالة مراجعة الدفع</h1>
        <p>متابعة طلب تفعيل الاشتراك</p>
      </div>
    </div>
    @if (!proof) {
      <div class="card empty">
        <div class="upload-icon">◇</div>
        <h3>لا يوجد إثبات مرسل بعد</h3>
        <p class="muted small">أرسلي إثبات التحويل لمتابعة حالة المراجعة هنا.</p>
        <a class="btn primary" routerLink="/p/payment">إرسال إثبات التحويل</a>
      </div>
    } @else {
      <div class="card empty">
        <div class="upload-icon">⌛</div>
        <h3>{{ heading }}</h3>
        <p class="muted small">{{ hint }}</p>
        <span class="status" [class.success]="approved" [class.warning]="!approved && !rejected" [class.error]="rejected">{{ statusLabel }}</span>
        <br /><br />
        <div class="notice" style="max-width:520px;margin:auto;text-align:right">
          الباقة: {{ locale.localizedName(proof.subscription.package) }} · المبلغ: {{ proof.amount }} ر.س · {{ when(proof.createdAt) }}
        </div>
      </div>
    }
  `,
})
export class ProviderPaymentStatusComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  proof: PaymentProof | null = null;

  ngOnInit(): void {
    this.shell.set('حالة الدفع');
    this.api.providerSubscription().subscribe({
      next: (data) => {
        this.proof = data.proofs[0] ?? null;
      },
    });
  }

  get approved(): boolean {
    return this.proof?.opsStatus === 'APPROVED' && this.proof?.financeStatus === 'APPROVED';
  }

  get rejected(): boolean {
    return this.proof?.opsStatus === 'REJECTED' || this.proof?.financeStatus === 'REJECTED';
  }

  get statusLabel(): string {
    if (this.approved) {
      return 'تم الاعتماد';
    }
    if (this.rejected) {
      return 'مرفوض';
    }
    return 'قيد المراجعة';
  }

  get heading(): string {
    if (this.approved) {
      return 'تم اعتماد الإثبات';
    }
    if (this.rejected) {
      return 'لم يتم اعتماد الإثبات';
    }
    return 'الإثبات قيد المراجعة';
  }

  get hint(): string {
    if (this.approved) {
      return 'تم تفعيل الاشتراك وفق الباقة المعتمدة.';
    }
    if (this.rejected) {
      return 'راجعي بيانات التحويل وأرسلي إثباتًا جديدًا إذا لزم الأمر.';
    }
    return 'استلمنا إثبات التحويل الخاص بك. عادةً تستغرق المراجعة حتى 24 ساعة.';
  }

  when(value: string): string {
    return value.slice(0, 16).replace('T', ' ');
  }
}
