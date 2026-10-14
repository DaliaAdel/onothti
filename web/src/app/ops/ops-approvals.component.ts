import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage } from '../core/phone';
import type { OpsMediaItem, OpsProfileChange, OpsRating } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { clip, keepSelected, newestFirst, opsDate, statusTone } from './ops-ui';

type ApprovalKind = 'name' | 'photo' | 'bio' | 'rating' | 'portfolio' | 'receipt' | 'other';

type ApprovalItem = {
  id: string;
  kind: ApprovalKind;
  createdAt: string;
  accountName: string;
  accountCode: string;
  accountType?: string;
  summary: string;
  previewUrl?: string;
  isVideo?: boolean;
  rating?: OpsRating;
  change?: OpsProfileChange;
  media?: OpsMediaItem;
};

@Component({
  selector: 'app-ops-approvals',
  imports: [FormsModule, OpsDrawerComponent],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>الاعتمادات</h2>
        <p>الاسم والصورة والنبذة والتقييم، مع أعمال الخبيرات وإيصالات التحويل.</p>
      </div>
    </div>
    <div class="filters">
      <button class="chip" type="button" [class.active]="kind === ''" (click)="setKind('')">الكل</button>
      @if (canSeeProfile) {
        <button class="chip" type="button" [class.active]="kind === 'name'" (click)="setKind('name')">الاسم</button>
      }
      @if (canSeeContent) {
        <button class="chip" type="button" [class.active]="kind === 'photo'" (click)="setKind('photo')">الصورة</button>
      }
      @if (canSeeProfile) {
        <button class="chip" type="button" [class.active]="kind === 'bio'" (click)="setKind('bio')">النبذة</button>
        <button class="chip" type="button" [class.active]="kind === 'rating'" (click)="setKind('rating')">التقييم</button>
      }
      @if (canSeeContent) {
        <button class="chip" type="button" [class.active]="kind === 'portfolio'" (click)="setKind('portfolio')">أعمال</button>
      }
      @if (canSeeReceipts) {
        <button class="chip" type="button" [class.active]="kind === 'receipt'" (click)="setKind('receipt')">إيصالات</button>
      }
      @if (otherCount) {
        <button class="chip" type="button" [class.active]="kind === 'other'" (click)="setKind('other')">أخرى</button>
      }
      <button class="chip" type="button" [class.active]="accountType === 'PROVIDER'" (click)="toggleAccount('PROVIDER')">الخبيرة</button>
      <button class="chip" type="button" [class.active]="accountType === 'CUSTOMER'" (click)="toggleAccount('CUSTOMER')">العميلة</button>
    </div>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!visible.length) {
      <p class="page-empty">لا توجد عناصر بانتظار الاعتماد في هذا التبويب.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>المعاينة</th>
              <th>النوع</th>
              <th>الحساب</th>
              <th>التفاصيل</th>
              <th>الحالة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            @for (item of visible; track item.id) {
              <tr [class.active]="selected?.id === item.id" (click)="selected = item">
                <td>
                  @if (!item.isVideo && item.previewUrl) {
                    <img class="ops-thumb" [src]="item.previewUrl" alt="" loading="lazy" decoding="async" />
                  } @else {
                    <span class="muted small">{{ kindLabel(item.kind) }}</span>
                  }
                </td>
                <td>{{ kindLabel(item.kind) }}</td>
                <td>
                  <b>{{ item.accountName }}</b>
                  <div class="muted small">{{ accountLabel(item.accountType) }} · {{ item.accountCode }}</div>
                </td>
                <td class="clip">{{ clip(item.summary) }}</td>
                <td><span class="status {{ statusTone(statusCode(item)) }}">{{ statusLabel(item) }}</span></td>
                <td>{{ opsDate(item.createdAt) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <app-ops-drawer
      [open]="!!selected"
      [title]="selected?.accountName || ''"
      [kicker]="selected ? kindLabel(selected.kind) : 'اعتماد'"
      (closed)="selected = null"
    >
      @if (selected; as item) {
        @if (item.media) {
          <div class="ops-preview">
            @if (item.media.kind === 'VIDEO' && preview(item.media)) {
              <video [src]="preview(item.media)" controls></video>
            } @else if (preview(item.media)) {
              <img [src]="preview(item.media)" alt="" decoding="async" />
            } @else {
              <pre>{{ item.media.text || 'لا توجد معاينة' }}</pre>
            }
          </div>
          <p class="muted small" style="margin-top:12px">
            {{ accountLabel(item.media.owner.accountType) }} · {{ item.media.owner.accountCode }} ·
            <span dir="ltr">{{ item.media.owner.mobile }}</span>
          </p>
          <p class="muted small">{{ opsDate(item.media.createdAt) }} · {{ item.media.kind }} · {{ statusLabel(item) }}</p>
          @if (item.media.proofs.length) {
            <p class="muted small">إيصال {{ item.media.proofs[0].package.nameAr }} · {{ item.media.proofs[0].amount }} ر.س</p>
            @if (canApproveMedia(item.media)) {
              <div class="form-grid" style="margin-top:10px">
                <div class="field">
                  <label>تاريخ التفعيل</label>
                  <input class="input" type="date" [(ngModel)]="dates[item.media.id].startAt" />
                </div>
                <div class="field">
                  <label>تاريخ الانتهاء</label>
                  <input class="input" type="date" [(ngModel)]="dates[item.media.id].endAt" />
                </div>
              </div>
            }
          }
          <textarea class="input" style="margin-top:10px" rows="2" placeholder="ملاحظة اختيارية" [(ngModel)]="notes[item.media.id]"></textarea>
          <div class="ops-drawer-actions">
            @if (canApproveMedia(item.media)) {
              <button class="btn primary" type="button" (click)="reviewMedia(item, true)">اعتماد</button>
              <button class="btn ghost" type="button" (click)="reviewMedia(item, false)">رفض</button>
            }
            @if (canEscalate(item.media)) {
              <button class="btn primary" type="button" (click)="escalate(item)">تحويل للمالية</button>
            }
            @if (item.media.purpose === 'RECEIPT' && canSeeReceipts) {
              <button class="btn soft" type="button" (click)="clearer(item)">طلب صورة أوضح</button>
            }
          </div>
        }
        @if (item.rating) {
          <p class="muted small">{{ item.rating.customer.accountCode }} → {{ item.rating.provider.accountCode }}</p>
          <p class="muted small">{{ opsDate(item.rating.createdAt) }}</p>
          <p style="margin:12px 0;letter-spacing:2px;color:var(--copper-dark);font-size:18px">{{ stars(item.rating.stars) }}</p>
          <p style="white-space:pre-wrap;line-height:1.8">{{ item.rating.note || 'بدون ملاحظة' }}</p>
          <textarea class="input" rows="2" placeholder="ملاحظة اختيارية" [(ngModel)]="ratingNotes[item.rating.id]"></textarea>
          <div class="ops-drawer-actions">
            <button class="btn primary" type="button" (click)="reviewRating(item, true)">اعتماد</button>
            <button class="btn ghost" type="button" (click)="reviewRating(item, false)">رفض</button>
          </div>
        }
        @if (item.change) {
          <p class="muted small">{{ accountLabel(item.change.user.accountType) }} · {{ item.change.user.accountCode }}</p>
          <p class="muted small">{{ opsDate(item.change.createdAt) }}</p>
          <p class="muted small" style="margin-top:14px">القيمة الحالية</p>
          <p style="margin:0 0 10px;white-space:pre-wrap;word-break:break-word">{{ item.change.oldValue || '—' }}</p>
          <p class="muted small">القيمة المطلوبة</p>
          <p style="margin:0 0 14px;white-space:pre-wrap;word-break:break-word">{{ item.change.newValue }}</p>
          <div class="ops-drawer-actions">
            <button class="btn primary" type="button" (click)="reviewChange(item, true)">اعتماد</button>
            <button class="btn ghost" type="button" (click)="reviewChange(item, false)">رفض</button>
          </div>
        }
      }
    </app-ops-drawer>
  `,
})
export class OpsApprovalsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly opsDate = opsDate;
  readonly clip = clip;
  readonly statusTone = statusTone;
  readonly mediaUrl = mediaUrl;

  kind: ApprovalKind | '' = '';
  accountType = '';
  loading = true;
  items: ApprovalItem[] = [];
  selected: ApprovalItem | null = null;
  ratingNotes: Record<string, string> = {};
  notes: Record<string, string> = {};
  dates: Record<string, { startAt: string; endAt: string }> = {};

  get canSeeProfile(): boolean {
    return this.session.hasPermission('RATINGS_REVIEW');
  }

  get canSeeContent(): boolean {
    return this.session.hasAnyPermission('RATINGS_REVIEW', 'MEDIA_REVIEW');
  }

  get canSeeReceipts(): boolean {
    return this.session.hasAnyPermission('PAYMENTS_REVIEW', 'PAYMENTS_CONFIRM', 'ESCALATE_FINANCE');
  }

  get visible(): ApprovalItem[] {
    return this.items.filter((item) => {
      if (this.kind && item.kind !== this.kind) {
        return false;
      }
      if (this.accountType && item.accountType !== this.accountType) {
        return false;
      }
      return true;
    });
  }

  get otherCount(): number {
    return this.items.filter((item) => item.kind === 'other').length;
  }

  ngOnInit(): void {
    this.shell.set('الاعتمادات', 'الملف والأعمال والإيصالات والتقييم');
    const kind = this.route.snapshot.queryParamMap.get('kind');
    const purpose = this.route.snapshot.queryParamMap.get('purpose');
    const mapped = this.mapQuery(kind, purpose);
    if (mapped) {
      this.kind = mapped;
    }
    this.load();
  }

  setKind(kind: ApprovalKind | ''): void {
    this.kind = kind;
    this.selected = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { kind: kind || null, purpose: null },
      queryParamsHandling: 'merge',
    });
  }

  toggleAccount(type: string): void {
    this.accountType = this.accountType === type ? '' : type;
    this.selected = null;
  }

  kindLabel(kind: ApprovalKind): string {
    const labels: Record<ApprovalKind, string> = {
      name: 'الاسم',
      photo: 'الصورة',
      bio: 'النبذة',
      rating: 'التقييم',
      portfolio: 'أعمال',
      receipt: 'إيصال',
      other: 'تعديل آخر',
    };
    return labels[kind];
  }

  accountLabel(type?: string): string {
    if (type === 'CUSTOMER') {
      return 'عميلة';
    }
    if (type === 'PROVIDER') {
      return 'خبيرة';
    }
    return 'حساب';
  }

  stars(count: number): string {
    return '★'.repeat(Math.max(0, Math.min(5, count))) + '☆'.repeat(Math.max(0, 5 - count));
  }

  preview(item: OpsMediaItem): string {
    return this.mediaUrl(item.url);
  }

  statusCode(item: ApprovalItem): string {
    const opsStatus = item.media?.proofs[0]?.opsStatus;
    if (opsStatus === 'ESCALATED') {
      return 'IN_PROGRESS';
    }
    return item.media?.status || 'PENDING';
  }

  statusLabel(item: ApprovalItem): string {
    const opsStatus = item.media?.proofs[0]?.opsStatus;
    if (opsStatus === 'ESCALATED') {
      return 'محوّل للمالية';
    }
    const status = item.media?.status;
    if (status === 'NEED_CLEARER') {
      return 'صورة أوضح';
    }
    if (status === 'APPROVED') {
      return 'معتمد';
    }
    if (status === 'REJECTED') {
      return 'مرفوض';
    }
    return 'بانتظار الاعتماد';
  }

  canApproveMedia(file: OpsMediaItem): boolean {
    if (file.purpose === 'RECEIPT') {
      return this.session.hasPermission('PAYMENTS_CONFIRM');
    }
    return this.canSeeContent;
  }

  canEscalate(file: OpsMediaItem): boolean {
    if (file.purpose !== 'RECEIPT' || !this.session.hasPermission('ESCALATE_FINANCE')) {
      return false;
    }
    const opsStatus = file.proofs[0]?.opsStatus;
    return opsStatus !== 'ESCALATED' && opsStatus !== 'APPROVED';
  }

  reviewMedia(item: ApprovalItem, approve: boolean): void {
    const file = item.media;
    if (!file) {
      return;
    }
    const dates = this.dates[file.id];
    this.api
      .opsReviewMedia(file.id, {
        approve,
        note: this.notes[file.id],
        startAt: dates?.startAt ? new Date(dates.startAt).toISOString() : undefined,
        endAt: dates?.endAt ? new Date(dates.endAt).toISOString() : undefined,
      })
      .subscribe({
        next: () => {
          this.toast.show(approve ? 'تم الاعتماد' : 'تم الرفض');
          this.selected = null;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر تنفيذ المراجعة')),
      });
  }

  escalate(item: ApprovalItem): void {
    const file = item.media;
    if (!file) {
      return;
    }
    this.api.opsEscalateReceipt(file.id).subscribe({
      next: (row) => {
        this.toast.show('تم تحويل الإيصال للمالية');
        const updated = this.fromFile(row);
        this.items = this.items.map((entry) => (entry.id === item.id ? updated : entry));
        this.selected = updated;
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحويل الإيصال')),
    });
  }

  clearer(item: ApprovalItem): void {
    const file = item.media;
    if (!file) {
      return;
    }
    this.api.opsReviewMedia(file.id, { requestClearer: true, note: this.notes[file.id] }).subscribe({
      next: () => {
        this.toast.show('تم طلب صورة أوضح');
        this.selected = null;
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إرسال الطلب')),
    });
  }

  reviewRating(item: ApprovalItem, approve: boolean): void {
    const rating = item.rating;
    if (!rating) {
      return;
    }
    this.api.opsReviewRating(rating.id, approve, this.ratingNotes[rating.id]).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد التقييم' : 'تم رفض التقييم');
        this.selected = null;
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر مراجعة التقييم')),
    });
  }

  reviewChange(item: ApprovalItem, approve: boolean): void {
    const change = item.change;
    if (!change) {
      return;
    }
    this.api.opsReviewChange(change.id, approve).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد التعديل' : 'تم رفض التعديل');
        this.selected = null;
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر مراجعة التعديل')),
    });
  }

  private mapQuery(kind: string | null, purpose: string | null): ApprovalKind | '' {
    if (kind === 'name' || kind === 'photo' || kind === 'bio' || kind === 'rating' || kind === 'portfolio' || kind === 'receipt' || kind === 'other') {
      return kind;
    }
    if (purpose === 'RECEIPT') {
      return 'receipt';
    }
    if (purpose === 'PORTFOLIO') {
      return 'portfolio';
    }
    if (purpose === 'AVATAR') {
      return 'photo';
    }
    return '';
  }

  private load(): void {
    this.loading = true;
    forkJoin({
      changes: this.canSeeProfile ? this.api.opsProfileChanges('PENDING') : of([] as OpsProfileChange[]),
      ratings: this.canSeeProfile ? this.api.opsRatings('PENDING') : of([] as OpsRating[]),
      files: this.canSeeContent || this.canSeeReceipts ? this.api.opsMedia() : of([] as OpsMediaItem[]),
    }).subscribe({
      next: ({ changes, ratings, files }) => {
        const fileIds = new Set(files.map((row) => row.id));
        const rows: ApprovalItem[] = [
          ...files.map((file) => this.fromFile(file)),
          ...changes.filter((row) => row.field !== 'AVATAR' || !fileIds.has(row.newValue)).map((row) => this.fromChange(row)),
          ...ratings.map((row) => this.fromRating(row)),
        ];
        this.items = newestFirst(rows);
        this.selected = keepSelected(this.items, this.selected);
        for (const row of ratings) {
          this.ratingNotes[row.id] ??= '';
        }
        for (const file of files) {
          this.notes[file.id] ??= '';
          this.dates[file.id] ??= { startAt: '', endAt: '' };
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الاعتمادات'));
      },
    });
  }

  private fromFile(file: OpsMediaItem): ApprovalItem {
    const kind: ApprovalKind = file.purpose === 'RECEIPT' ? 'receipt' : file.purpose === 'PORTFOLIO' ? 'portfolio' : 'photo';
    const proof = file.proofs[0];
    return {
      id: `file-${file.id}`,
      kind,
      createdAt: file.createdAt,
      accountName: file.owner.displayName,
      accountCode: file.owner.accountCode,
      accountType: file.owner.accountType,
      summary:
        kind === 'receipt' && proof
          ? `إيصال ${proof.package.nameAr} · ${proof.amount} ر.س`
          : kind === 'portfolio'
            ? file.kind === 'VIDEO'
              ? 'فيديو أعمال'
              : 'صورة أعمال'
            : 'صورة الحساب بانتظار الاعتماد',
      previewUrl: this.mediaUrl(file.url) || undefined,
      isVideo: file.kind === 'VIDEO',
      media: file,
    };
  }

  private fromChange(row: OpsProfileChange): ApprovalItem {
    const kind: ApprovalKind =
      row.field === 'DISPLAY_NAME' ? 'name' : row.field === 'BIO' ? 'bio' : row.field === 'AVATAR' ? 'photo' : 'other';
    return {
      id: `change-${row.id}`,
      kind,
      createdAt: row.createdAt,
      accountName: row.user.displayName,
      accountCode: row.user.accountCode,
      accountType: row.user.accountType,
      summary: row.newValue,
      change: row,
    };
  }

  private fromRating(row: OpsRating): ApprovalItem {
    return {
      id: `rating-${row.id}`,
      kind: 'rating',
      createdAt: row.createdAt,
      accountName: `${row.customer.displayName} → ${row.provider.displayName}`,
      accountCode: row.provider.accountCode,
      accountType: 'PROVIDER',
      summary: row.note || `${row.stars} نجوم`,
      rating: row,
    };
  }
}
