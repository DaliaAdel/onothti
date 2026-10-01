import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { CatalogPackage, ProviderSubscriptionResponse } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-payment',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ step === 'bank' ? 'تعليمات التحويل البنكي' : 'إرسال إثبات التحويل' }}</h1>
        <p>{{ step === 'bank' ? 'حوّلي قيمة الباقة ثم أرسلي إثبات التحويل' : 'اختاري إحدى الطريقتين لإرسال الإثبات' }}</p>
      </div>
    </div>
    <div class="steps">
      <span class="step done"><i>✓</i>اختيار الباقة</span>
      <span class="line"></span>
      <span class="step" [class.done]="step === 'proof'" [class.active]="step === 'bank'"><i>{{ step === 'proof' ? '✓' : '2' }}</i>التحويل البنكي</span>
      <span class="line"></span>
      <span class="step" [class.active]="step === 'proof'"><i>3</i>إثبات الدفع</span>
    </div>
    @if (step === 'bank') {
      <div class="grid wide-side">
        <div class="card">
          <h3>بيانات الحساب البنكي</h3>
          <table class="table">
            <tr><th>الباقة المختارة</th><td>{{ pkg ? locale.localizedName(pkg) : '—' }}</td></tr>
            @if (bank) {
              <tr><th>اسم البنك</th><td>{{ bank.bankName }}</td></tr>
              <tr><th>اسم المستفيد</th><td>{{ bank.accountName }}</td></tr>
              <tr><th>رقم الآيبان</th><td dir="ltr">{{ bank.iban }}</td></tr>
            }
            <tr><th>المبلغ</th><td>{{ pkg?.price ?? 0 }} ر.س</td></tr>
          </table>
          <br />
          <button class="btn primary" type="button" (click)="step = 'proof'">  إرسال الإثبات</button>
        </div>
        <div class="notice">تأكدي من تحويل المبلغ الصحيح والاحتفاظ بإيصال التحويل. تتم مراجعة الإثبات يدويًا قبل تفعيل الاشتراك.</div>
      </div>
    } @else {
      <div class="tabs">
        <button type="button" [class.active]="tab === 'file'" (click)="tab = 'file'">رفع إيصال التحويل</button>
        <button type="button" [class.active]="tab === 'text'" (click)="tab = 'text'">لصق رسالة التحويل</button>
      </div>
      <div class="grid payment-proof-layout">
        <div class="card">
          @if (tab === 'file') {
            <label class="upload" [class.drag]="dragging" (dragenter)="onDrag($event, true)" (dragover)="onDrag($event, true)" (dragleave)="onDrag($event, false)" (drop)="onDrop($event)">
              <input type="file" accept="image/*,.pdf" (change)="onFile($event)" />
              <div class="upload-icon">⇧</div>
              <h3>{{ fileName || 'اسحبي صورة الإيصال هنا' }}</h3>
              <p class="muted small">أو اضغطي للاختيار · JPG أو PNG أو PDF — حتى 5MB</p>
              <span class="btn secondary">اختيار الملف</span>
            </label>
          } @else {
            <div class="field">
              <label>نص رسالة التحويل البنكي</label>
              <textarea [(ngModel)]="transferText" name="transferText" placeholder="الصقي هنا رسالة البنك التي تحتوي على تفاصيل التحويل..."></textarea>
            </div>
          }
          <div class="field" style="margin-top:18px">
            <label>رقم مرجع التحويل (اختياري)</label>
            <input name="reference" [(ngModel)]="reference" placeholder="مثال: 845291" />
          </div>
          <div class="payment-safe-note">لا تشاركي رمز OTP أو بيانات بطاقتك البنكية داخل الإثبات.</div>
        </div>
        <div class="card payment-summary">
          <h3>ملخص الطلب</h3>
          <div class="summary-line"><span>الباقة</span><b>{{ pkg ? locale.localizedName(pkg) : '—' }}</b></div>
          <div class="summary-line"><span>طريقة الدفع</span><b>تحويل بنكي</b></div>
          <div class="summary-line total"><span>المبلغ المطلوب</span><b>{{ pkg?.price ?? 0 }} ر.س</b></div>
          <button class="btn primary" type="button" [disabled]="loading || !ready" (click)="submit()">إرسال الإثبات للمراجعة</button>
          @if (!ready) {
            <p class="proof-hint">ارفعي الإيصال أو اكتبي رسالة التحويل (8 أحرف على الأقل) لتفعيل زر الإرسال.</p>
          }
          <a class="btn ghost" routerLink="/p/package">العودة للباقات</a>
        </div>
      </div>
    }
  `,
})
export class ProviderPaymentComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellService);
  readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  step: 'bank' | 'proof' = 'bank';
  tab: 'file' | 'text' = 'file';
  dragging = false;
  loading = false;
  transferText = '';
  reference = '';
  fileName = '';
  storageKey = '';
  mime = '';
  sizeBytes = 0;
  packageId = '';
  data: ProviderSubscriptionResponse | null = null;

  get pkg(): CatalogPackage | undefined {
    return this.data?.packages.find((item) => item.id === this.packageId) ?? this.data?.current?.package;
  }

  get bank() {
    return this.data?.bankAccounts?.[0];
  }

  get ready(): boolean {
    return this.tab === 'text' ? this.transferText.trim().length >= 8 : Boolean(this.storageKey);
  }

  ngOnInit(): void {
    this.shell.set('إثبات التحويل');
    this.packageId = this.route.snapshot.queryParamMap.get('packageId') ?? '';
    this.api.providerSubscription().subscribe({
      next: (data) => {
        this.data = data;
        this.packageId = this.packageId || data.current?.package.id || data.packages.find((item) => item.code !== 'FREE')?.id || data.packages[0]?.id || '';
      },
    });
  }

  onDrag(event: DragEvent, over: boolean): void {
    event.preventDefault();
    this.dragging = over;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.useFile(file);
    }
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.useFile(file);
    }
  }

  submit(): void {
    if (!this.packageId) {
      this.toast.show('اختاري الباقة أولًا');
      return;
    }
    if (!this.ready) {
      return;
    }
    this.loading = true;
    const reference = this.reference.trim();
    this.api
      .submitPaymentProof({
        packageId: this.packageId,
        amount: Number(this.pkg?.price) || undefined,
        transferText: this.tab === 'text' ? this.transferText.trim() : undefined,
        reference: reference || undefined,
        storageKey: this.tab === 'file' ? this.storageKey : undefined,
        mime: this.tab === 'file' ? this.mime : undefined,
        kind: this.tab === 'text' ? 'TEXT' : this.mime.includes('pdf') ? 'PDF' : 'IMAGE',
        sizeBytes: this.sizeBytes,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.toast.show('تم إرسال الإثبات للمراجعة');
          void this.router.navigateByUrl('/p/payment-status');
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر إرسال الإثبات'));
        },
      });
  }

  private useFile(file: File): void {
    this.fileName = file.name;
    this.storageKey = `proofs/${file.name}`;
    this.mime = file.type || 'image/jpeg';
    this.sizeBytes = file.size;
  }
}
