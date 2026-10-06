import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage } from '../core/phone';
import type { OpsMediaItem } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-ops-media',
  imports: [FormsModule],
  template: `
    <div class="filters">
      <button class="chip" type="button" [class.active]="purpose === ''" (click)="setPurpose('')">الكل</button>
      <button class="chip" type="button" [class.active]="purpose === 'AVATAR'" (click)="setPurpose('AVATAR')">صور الحساب</button>
      <button class="chip" type="button" [class.active]="purpose === 'PORTFOLIO'" (click)="setPurpose('PORTFOLIO')">أعمال</button>
      <button class="chip" type="button" [class.active]="purpose === 'RECEIPT'" (click)="setPurpose('RECEIPT')">إيصالات</button>
      <button class="chip" type="button" [class.active]="accountType === 'PROVIDER'" (click)="toggleAccount('PROVIDER')">الخبيرة</button>
      <button class="chip" type="button" [class.active]="accountType === 'CUSTOMER'" (click)="toggleAccount('CUSTOMER')">العميلة</button>
    </div>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!items.length) {
      <p class="page-empty">لا توجد ملفات بانتظار الاعتماد.</p>
    } @else {
      <div class="grid two">
        @for (item of items; track item.id) {
          <article class="card">
            <div class="ops-preview">
              @if (item.kind === 'VIDEO' && preview(item)) {
                <video [src]="preview(item)" controls></video>
              } @else if (preview(item)) {
                <img [src]="preview(item)" alt="" />
              } @else {
                <pre>{{ item.text || 'لا توجد معاينة' }}</pre>
              }
            </div>
            <p style="margin:12px 0 4px;font-weight:700;color:var(--plum)">
              {{ item.owner.displayName }}
              <small class="muted"> · {{ ownerLabel(item) }} · {{ purposeLabel(item) }}</small>
            </p>
            <p class="muted small">{{ item.owner.accountCode }} · {{ item.kind }} · {{ item.status }}</p>
            @if (item.proofs.length) {
              <p class="muted small">إيصال {{ item.proofs[0].package.nameAr }} · {{ item.proofs[0].amount }} ر.س</p>
              <div class="form-grid" style="margin-top:10px">
                <div class="field">
                  <label>تاريخ التفعيل</label>
                  <input class="input" type="date" [(ngModel)]="dates[item.id].startAt" />
                </div>
                <div class="field">
                  <label>تاريخ الانتهاء</label>
                  <input class="input" type="date" [(ngModel)]="dates[item.id].endAt" />
                </div>
              </div>
            }
            <textarea class="input" style="margin-top:10px" rows="2" placeholder="ملاحظة اختيارية" [(ngModel)]="notes[item.id]"></textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
              <button class="btn primary" type="button" (click)="review(item, true)">اعتماد</button>
              <button class="btn ghost" type="button" (click)="review(item, false)">رفض</button>
              @if (item.purpose === 'RECEIPT') {
                <button class="btn soft" type="button" (click)="clearer(item)">طلب صورة أوضح</button>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class OpsMediaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  items: OpsMediaItem[] = [];
  loading = true;
  purpose = '';
  accountType = '';
  notes: Record<string, string> = {};
  dates: Record<string, { startAt: string; endAt: string }> = {};
  readonly mediaUrl = mediaUrl;

  ngOnInit(): void {
    this.shell.set('اعتماد الملفات', 'صور وفيديو وإيصالات العميلة والخبيرة');
    this.load();
  }

  setPurpose(purpose: string): void {
    this.purpose = purpose;
    this.load();
  }

  toggleAccount(type: string): void {
    this.accountType = this.accountType === type ? '' : type;
    this.load();
  }

  preview(item: OpsMediaItem): string {
    return this.mediaUrl(item.url);
  }

  ownerLabel(item: OpsMediaItem): string {
    return item.owner.accountType === 'CUSTOMER' ? 'عميلة' : 'خبيرة';
  }

  purposeLabel(item: OpsMediaItem): string {
    if (item.purpose === 'RECEIPT') {
      return 'إيصال تحويل';
    }
    if (item.purpose === 'PORTFOLIO') {
      return item.kind === 'VIDEO' ? 'فيديو أعمال' : 'صورة أعمال';
    }
    if (item.purpose === 'AVATAR') {
      return 'صورة الحساب';
    }
    return 'ملف';
  }

  review(item: OpsMediaItem, approve: boolean): void {
    const dates = this.dates[item.id];
    this.api
      .opsReviewMedia(item.id, {
        approve,
        note: this.notes[item.id],
        startAt: dates?.startAt ? new Date(dates.startAt).toISOString() : undefined,
        endAt: dates?.endAt ? new Date(dates.endAt).toISOString() : undefined,
      })
      .subscribe({
        next: () => {
          this.toast.show(approve ? 'تم الاعتماد' : 'تم الرفض');
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر تنفيذ المراجعة')),
      });
  }

  clearer(item: OpsMediaItem): void {
    this.api.opsReviewMedia(item.id, { requestClearer: true, note: this.notes[item.id] }).subscribe({
      next: () => {
        this.toast.show('تم طلب صورة أوضح');
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الطلب')),
    });
  }

  private load(): void {
    this.loading = true;
    this.api
      .opsMedia({
        purpose: this.purpose || undefined,
        accountType: this.accountType || undefined,
      })
      .subscribe({
        next: (items) => {
          this.items = items;
          for (const item of items) {
            this.notes[item.id] ??= '';
            this.dates[item.id] ??= { startAt: '', endAt: '' };
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر تحميل الملفات'));
        },
      });
  }
}
