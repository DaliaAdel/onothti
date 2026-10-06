import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsComplaint, OpsProfileChange, OpsRating } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

type ReviewTab = 'ratings' | 'complaints' | 'changes';

@Component({
  selector: 'app-ops-reviews',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="filters">
      <button class="chip" type="button" [class.active]="tab === 'ratings'" (click)="setTab('ratings')">
        التقييمات
      </button>
      <button class="chip" type="button" [class.active]="tab === 'complaints'" (click)="setTab('complaints')">
        البلاغات
      </button>
      <button class="chip" type="button" [class.active]="tab === 'changes'" (click)="setTab('changes')">
        تعديلات الملف
      </button>
    </div>

    @if (tab === 'ratings') {
      <div class="filters">
        <button class="chip" type="button" [class.active]="ratingStatus === 'PENDING'" (click)="setRatingStatus('PENDING')">
          بانتظار المراجعة
        </button>
        <button class="chip" type="button" [class.active]="ratingStatus === 'APPROVED'" (click)="setRatingStatus('APPROVED')">
          معتمدة
        </button>
        <button class="chip" type="button" [class.active]="ratingStatus === 'REJECTED'" (click)="setRatingStatus('REJECTED')">
          مرفوضة
        </button>
      </div>
      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!ratings.length) {
        <p class="page-empty">لا توجد تقييمات في هذا التبويب.</p>
      } @else {
        <div class="grid two">
          @for (item of ratings; track item.id) {
            <article class="card">
              <p style="margin:0 0 6px;font-weight:700;color:var(--plum)">
                {{ item.customer.displayName }}
                <small class="muted">تقيّم {{ item.provider.displayName }}</small>
              </p>
              <p class="muted small">{{ item.customer.accountCode }} → {{ item.provider.accountCode }} · {{ item.createdAt | date: 'dd/MM/yyyy' }}</p>
              <p style="margin:10px 0;letter-spacing:2px;color:var(--copper-dark)">{{ stars(item.stars) }}</p>
              @if (item.note) {
                <p style="margin:0 0 10px">{{ item.note }}</p>
              }
              @if (item.status === 'PENDING') {
                <textarea class="input" rows="2" placeholder="ملاحظة اختيارية" [(ngModel)]="ratingNotes[item.id]"></textarea>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                  <button class="btn primary" type="button" (click)="reviewRating(item, true)">اعتماد</button>
                  <button class="btn ghost" type="button" (click)="reviewRating(item, false)">رفض</button>
                </div>
              } @else {
                <p class="muted small">الحالة: {{ statusAr(item.status) }}</p>
              }
            </article>
          }
        </div>
      }
    }

    @if (tab === 'complaints') {
      <div class="filters">
        <button class="chip" type="button" [class.active]="complaintStatus === 'OPEN'" (click)="setComplaintStatus('OPEN')">
          مفتوحة
        </button>
        <button class="chip" type="button" [class.active]="complaintStatus === 'ESCALATED'" (click)="setComplaintStatus('ESCALATED')">
          مصعّدة
        </button>
        <button class="chip" type="button" [class.active]="complaintStatus === 'CLOSED'" (click)="setComplaintStatus('CLOSED')">
          مغلقة
        </button>
      </div>
      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!complaints.length) {
        <p class="page-empty">لا توجد بلاغات في هذا التبويب.</p>
      } @else {
        <div class="grid two">
          @for (item of complaints; track item.id) {
            <article class="card">
              <p style="margin:0 0 6px;font-weight:700;color:var(--plum)">
                {{ item.reporter.displayName }}
                <small class="muted"> · {{ accountLabel(item.reporter.accountType) }}</small>
              </p>
              <p class="muted small">
                ضد {{ item.target?.displayName || item.targetRef || 'غير محدد' }}
                @if (item.target) {
                  · {{ item.target.accountCode }}
                }
                · {{ item.createdAt | date: 'dd/MM/yyyy' }}
              </p>
              <p style="margin:12px 0">{{ item.reason }}</p>
              @if (item.status !== 'CLOSED') {
                <textarea class="input" rows="2" placeholder="ملاحظة للمبلِّغة" [(ngModel)]="complaintNotes[item.id]"></textarea>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                  @if (item.status === 'OPEN') {
                    <button class="btn soft" type="button" (click)="patchComplaint(item, 'ESCALATED')">تصعيد</button>
                  }
                  <button class="btn primary" type="button" (click)="patchComplaint(item, 'CLOSED')">إغلاق</button>
                </div>
              } @else {
                <p class="muted small">مغلق</p>
              }
            </article>
          }
        </div>
      }
    }

    @if (tab === 'changes') {
      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!changes.length) {
        <p class="page-empty">لا توجد طلبات تعديل معلّقة.</p>
      } @else {
        <div class="grid two">
          @for (item of changes; track item.id) {
            <article class="card">
              <p style="margin:0 0 6px;font-weight:700;color:var(--plum)">
                {{ item.user.displayName }}
                <small class="muted"> · {{ accountLabel(item.user.accountType) }} · {{ fieldLabel(item.field) }}</small>
              </p>
              <p class="muted small">{{ item.user.accountCode }} · {{ item.createdAt | date: 'dd/MM/yyyy' }}</p>
              <p class="muted small" style="margin-top:10px">القيمة الحالية</p>
              <p style="margin:0 0 8px;word-break:break-word">{{ item.oldValue || '—' }}</p>
              <p class="muted small">القيمة المطلوبة</p>
              <p style="margin:0 0 12px;word-break:break-word">{{ item.newValue }}</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn primary" type="button" (click)="reviewChange(item, true)">اعتماد</button>
                <button class="btn ghost" type="button" (click)="reviewChange(item, false)">رفض</button>
              </div>
            </article>
          }
        </div>
      }
    }
  `,
})
export class OpsReviewsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  tab: ReviewTab = 'ratings';
  loading = true;
  ratings: OpsRating[] = [];
  complaints: OpsComplaint[] = [];
  changes: OpsProfileChange[] = [];
  ratingStatus = 'PENDING';
  complaintStatus = 'OPEN';
  ratingNotes: Record<string, string> = {};
  complaintNotes: Record<string, string> = {};

  ngOnInit(): void {
    this.shell.set('المراجعات', 'تقييمات وبلاغات وتعديلات الملف');
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'complaints' || tab === 'changes' || tab === 'ratings') {
      this.tab = tab;
    }
    this.load();
  }

  setTab(tab: ReviewTab): void {
    this.tab = tab;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
    this.load();
  }

  setRatingStatus(status: string): void {
    this.ratingStatus = status;
    this.load();
  }

  setComplaintStatus(status: string): void {
    this.complaintStatus = status;
    this.load();
  }

  stars(count: number): string {
    return '★'.repeat(Math.max(0, Math.min(5, count))) + '☆'.repeat(Math.max(0, 5 - count));
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

  fieldLabel(field: string): string {
    const labels: Record<string, string> = {
      DISPLAY_NAME: 'الاسم',
      EMAIL: 'البريد',
      AVATAR: 'الصورة',
      BIO: 'النبذة',
      WHATSAPP: 'واتساب',
      CITY: 'المدينة',
    };
    return labels[field] || field;
  }

  statusAr(status: string): string {
    if (status === 'APPROVED') {
      return 'معتمد';
    }
    if (status === 'REJECTED') {
      return 'مرفوض';
    }
    return 'بانتظار المراجعة';
  }

  reviewRating(item: OpsRating, approve: boolean): void {
    this.api.opsReviewRating(item.id, approve, this.ratingNotes[item.id]).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد التقييم' : 'تم رفض التقييم');
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر مراجعة التقييم')),
    });
  }

  patchComplaint(item: OpsComplaint, status: 'CLOSED' | 'ESCALATED'): void {
    this.api.opsPatchComplaint(item.id, status, this.complaintNotes[item.id]).subscribe({
      next: () => {
        this.toast.show(status === 'CLOSED' ? 'تم إغلاق البلاغ' : 'تم تصعيد البلاغ');
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث البلاغ')),
    });
  }

  reviewChange(item: OpsProfileChange, approve: boolean): void {
    this.api.opsReviewChange(item.id, approve).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد التعديل' : 'تم رفض التعديل');
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر مراجعة التعديل')),
    });
  }

  private load(): void {
    this.loading = true;
    if (this.tab === 'ratings') {
      this.api.opsRatings(this.ratingStatus).subscribe({
        next: (rows) => {
          this.ratings = rows;
          for (const row of rows) {
            this.ratingNotes[row.id] ??= '';
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر تحميل التقييمات'));
        },
      });
      return;
    }
    if (this.tab === 'complaints') {
      this.api.opsComplaints(this.complaintStatus).subscribe({
        next: (rows) => {
          this.complaints = rows;
          for (const row of rows) {
            this.complaintNotes[row.id] ??= '';
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر تحميل البلاغات'));
        },
      });
      return;
    }
    this.api.opsProfileChanges('PENDING').subscribe({
      next: (rows) => {
        this.changes = rows;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل طلبات التعديل'));
      },
    });
  }
}
