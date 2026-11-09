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
        <h1>{{ step === 'bank' ? locale.t('p.pay.titleBank') : locale.t('p.pay.titleProof') }}</h1>
        <p>{{ step === 'bank' ? locale.t('p.pay.subBank') : locale.t('p.pay.subProof') }}</p>
      </div>
    </div>
    <div class="steps">
      <span class="step done"><i>✓</i>{{ locale.t('p.pay.stepPkg') }}</span>
      <span class="line"></span>
      <span class="step" [class.done]="step === 'proof'" [class.active]="step === 'bank'"><i>{{ step === 'proof' ? '✓' : '2' }}</i>{{ locale.t('p.pay.stepBank') }}</span>
      <span class="line"></span>
      <span class="step" [class.active]="step === 'proof'"><i>3</i>{{ locale.t('p.pay.stepProof') }}</span>
    </div>
    @if (step === 'bank') {
      <div class="grid wide-side">
        <div class="card">
          <h3>{{ locale.t('p.pay.bankTitle') }}</h3>
          <table class="table">
            <tr><th>{{ locale.t('p.pay.chosenPkg') }}</th><td>{{ pkg ? locale.localizedName(pkg) : '—' }}</td></tr>
            @if (bank) {
              <tr><th>{{ locale.t('p.pay.bankName') }}</th><td>{{ bank.bankName }}</td></tr>
              <tr><th>{{ locale.t('p.pay.accountName') }}</th><td>{{ bank.accountName }}</td></tr>
              <tr><th>{{ locale.t('p.pay.iban') }}</th><td dir="ltr">{{ bank.iban }}</td></tr>
            }
            <tr><th>{{ locale.t('p.pay.amount') }}</th>
              <td>
                @if (hasDiscount(pkg)) {
                  <del>{{ money(pkg?.priceBefore) }} {{ locale.t('ui.sar') }}</del>
                  <b> {{ money(pkg?.price) }} {{ locale.t('ui.sar') }}</b>
                } @else {
                  {{ money(pkg?.price) }} {{ locale.t('ui.sar') }}
                }
              </td>
            </tr>
          </table>
          <br />
          <button class="btn primary" type="button" (click)="step = 'proof'">{{ locale.t('p.pay.sendProof') }}</button>
        </div>
        <div class="notice">{{ locale.t('p.pay.notice') }}</div>
      </div>
    } @else {
      <div class="tabs">
        <button type="button" [class.active]="tab === 'file'" (click)="tab = 'file'">{{ locale.t('p.pay.tabFile') }}</button>
        <button type="button" [class.active]="tab === 'text'" (click)="tab = 'text'">{{ locale.t('p.pay.tabText') }}</button>
      </div>
      <div class="grid payment-proof-layout">
        <div class="card">
          @if (tab === 'file') {
            <label class="upload" [class.drag]="dragging" (dragenter)="onDrag($event, true)" (dragover)="onDrag($event, true)" (dragleave)="onDrag($event, false)" (drop)="onDrop($event)">
              <input type="file" accept="image/*,.pdf" (change)="onFile($event)" />
              @if (previewUrl) {
                <img class="proof-preview" [src]="previewUrl" [attr.alt]="locale.t('p.pay.previewAlt')" />
              } @else {
                <div class="upload-icon">⇧</div>
              }
              <h3>{{ fileName || locale.t('p.pay.drop') }}</h3>
              <p class="muted small">{{ locale.t('p.pay.dropHint') }}</p>
              <span class="btn secondary">{{ uploading ? locale.t('p.pay.uploading') : locale.t('p.pay.pickFile') }}</span>
            </label>
          } @else {
            <div class="field">
              <label>{{ locale.t('p.pay.transferText') }}</label>
              <textarea [(ngModel)]="transferText" name="transferText" [placeholder]="locale.t('p.pay.transferPh')"></textarea>
            </div>
          }
          <div class="field" style="margin-top:18px">
            <label>{{ locale.t('p.pay.ref') }}</label>
            <input name="reference" [(ngModel)]="reference" placeholder="845291" />
          </div>
          <div class="payment-safe-note">{{ locale.t('p.pay.safe') }}</div>
        </div>
        <div class="card payment-summary">
          <h3>{{ locale.t('p.pay.summary') }}</h3>
          <div class="summary-line"><span>{{ locale.t('p.st.package') }}</span><b>{{ pkg ? locale.localizedName(pkg) : '—' }}</b></div>
          <div class="summary-line"><span>{{ locale.t('p.pay.method') }}</span><b>{{ locale.t('p.pay.bankTransfer') }}</b></div>
          @if (hasDiscount(pkg)) {
            <div class="summary-line"><span>{{ locale.t('p.pkg.before') }}</span><b>{{ money(pkg?.priceBefore) }} {{ locale.t('ui.sar') }}</b></div>
            <div class="summary-line"><span>{{ locale.t('p.pkg.discount') }}</span><b>{{ money(pkg?.discountPercent) }}%</b></div>
          }
          <div class="summary-line total"><span>{{ locale.t('p.pay.due') }}</span><b>{{ money(pkg?.price) }} {{ locale.t('ui.sar') }}</b></div>
          <button class="btn primary" type="button" [disabled]="loading || uploading || !ready" (click)="submit()">{{ locale.t('p.pay.submit') }}</button>
          @if (!ready) {
            <p class="proof-hint">{{ uploading ? locale.t('p.pay.hintUp') : locale.t('p.pay.hintNeed') }}</p>
          }
          <a class="btn ghost back" routerLink="/p/package">{{ locale.t('p.pay.backPkgs') }}</a>
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
  uploading = false;
  transferText = '';
  reference = '';
  fileName = '';
  storageKey = '';
  mime = '';
  sizeBytes = 0;
  previewUrl = '';
  private previewObject = '';
  packageId = '';
  data: ProviderSubscriptionResponse | null = null;

  get pkg(): CatalogPackage | undefined {
    return this.data?.packages.find((item) => item.id === this.packageId) ?? this.data?.current?.package;
  }

  get bank() {
    return this.data?.bankAccounts?.[0];
  }

  get ready(): boolean {
    return this.tab === 'text' ? this.transferText.trim().length >= 8 : Boolean(this.storageKey) && !this.uploading;
  }

  money(value: number | string | null | undefined): number {
    const next = Number(value ?? 0);
    return Number.isFinite(next) ? next : 0;
  }

  hasDiscount(pkg: CatalogPackage | undefined): boolean {
    return this.money(pkg?.discountPercent) > 0;
  }

  ngOnInit(): void {
    this.shell.set('nav.payment');
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
      this.toast.show(this.locale.t('p.pay.needPkg'));
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
        amount: this.money(this.pkg?.price) || undefined,
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
          this.toast.show(this.locale.t('p.pay.sent'));
          void this.router.navigateByUrl('/p/payment-status');
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, this.locale.t('p.pay.sendFail')));
        },
      });
  }

  private useFile(file: File): void {
    this.fileName = file.name;
    this.storageKey = '';
    this.mime = file.type || 'image/jpeg';
    this.sizeBytes = file.size;
    if (this.previewObject) {
      URL.revokeObjectURL(this.previewObject);
      this.previewObject = '';
    }
    if (file.type.startsWith('image/')) {
      this.previewObject = URL.createObjectURL(file);
      this.previewUrl = this.previewObject;
    } else {
      this.previewUrl = '';
    }
    this.uploading = true;
    this.api.uploadPaymentProof(file).subscribe({
      next: (res) => {
        this.storageKey = res.storageKey;
        this.mime = res.mime;
        this.sizeBytes = res.sizeBytes;
        this.uploading = false;
      },
      error: (err) => {
        this.uploading = false;
        this.storageKey = '';
        this.toast.show(apiMessage(err, this.locale.t('p.pay.uploadFail')));
      },
    });
  }
}
