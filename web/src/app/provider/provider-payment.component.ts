import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { CatalogPackage, ProviderSubscriptionResponse } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-payment',
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="grid two">
      <section class="card">
        <div class="segmented">
          <button type="button" [class.active]="tab === 'file'" (click)="tab = 'file'">رفع إيصال التحويل</button>
          <button type="button" [class.active]="tab === 'text'" (click)="tab = 'text'">لصق رسالة التحويل</button>
        </div>
        @if (tab === 'file') {
          <label class="upload" style="margin-top:17px" [class.drag]="dragging" (dragenter)="onDrag($event, true)" (dragover)="onDrag($event, true)" (dragleave)="onDrag($event, false)" (drop)="onDrop($event)">
            <input type="file" hidden (change)="onFile($event)" />
            <div>
              <app-icon name="upload" />
              <h3>{{ fileName || 'اسحبي صورة الإيصال هنا' }}</h3>
              <p>أو اضغطي للاختيار · JPG أو PNG أو PDF · 5MB</p>
            </div>
          </label>
        } @else {
          <textarea class="input" style="margin-top:17px;min-height:180px" [(ngModel)]="transferText" name="transferText" placeholder="الصقي نص رسالة التحويل هنا"></textarea>
        }
        <div class="notice" style="margin-top:13px">لا تشاركي رمز OTP أو بيانات بطاقتك البنكية داخل الإثبات.</div>
      </section>
      <aside class="card">
        <span class="eyebrow">ملخص الطلب</span>
        <h3 style="color:var(--plum)">{{ pkg ? locale.localizedName(pkg) : 'تفعيل أو تمديد الباقة' }}</h3>
        <p style="color:var(--muted);font-size:10px">سيراجع الفريق الإثبات قبل تفعيل الظهور</p>
        @if (data?.bankAccounts?.length) {
          <hr style="border:0;border-top:1px solid var(--line);margin:18px 0" />
          @for (bank of data!.bankAccounts; track bank.id) {
            <p style="font-size:11px;line-height:1.8">{{ bank.bankName }}<br />{{ bank.iban }}<br />{{ bank.accountName }}</p>
          }
        }
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:12px">
          <span>المبلغ المطلوب</span>
          <strong>{{ pkg?.price ?? 0 }} ر.س</strong>
        </div>
        <button class="btn primary full" style="margin-top:25px" type="button" [disabled]="loading" (click)="submit()">
          إرسال الإثبات للمراجعة
        </button>
        <a class="text-link" routerLink="/p/package" style="display:block;text-align:center;margin-top:10px">العودة للباقة</a>
      </aside>
    </div>
  `,
})
export class ProviderPaymentComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly shell = inject(ShellService);
  readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  tab: 'file' | 'text' = 'file';
  dragging = false;
  loading = false;
  transferText = '';
  fileName = '';
  storageKey = '';
  mime = '';
  sizeBytes = 0;
  packageId = '';
  data: ProviderSubscriptionResponse | null = null;

  get pkg(): CatalogPackage | undefined {
    return this.data?.packages.find((item) => item.id === this.packageId) ?? this.data?.current?.package;
  }

  ngOnInit(): void {
    this.shell.set('إثبات التحويل', 'أرسلي صورة الإيصال أو نص رسالة التحويل للمراجعة');
    this.packageId = this.route.snapshot.queryParamMap.get('packageId') ?? '';
    this.api.providerSubscription().subscribe({
      next: (data) => {
        this.data = data;
        this.packageId = this.packageId || data.current?.package.id || data.packages[0]?.id || '';
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
    if (this.tab === 'text' && this.transferText.trim().length < 8) {
      this.toast.show('الصقي نص رسالة التحويل');
      return;
    }
    if (this.tab === 'file' && !this.storageKey) {
      this.toast.show('أضيفي صورة الإيصال');
      return;
    }
    this.loading = true;
    this.api
      .submitPaymentProof({
        packageId: this.packageId,
        amount: Number(this.pkg?.price ?? 0),
        transferText: this.tab === 'text' ? this.transferText.trim() : undefined,
        storageKey: this.tab === 'file' ? this.storageKey : undefined,
        mime: this.tab === 'file' ? this.mime : undefined,
        kind: this.tab === 'text' ? 'TEXT' : this.mime.includes('pdf') ? 'PDF' : 'IMAGE',
        sizeBytes: this.sizeBytes,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.toast.show('تم إرسال الإثبات للمراجعة');
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
    this.toast.show('تمت إضافة ملف الإثبات');
  }
}
