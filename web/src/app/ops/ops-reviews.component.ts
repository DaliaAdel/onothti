import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsComplaint, OpsProfileChange, OpsRating } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { clip, keepSelected, newestFirst, opsDate, statusTone } from './ops-ui';

type ReviewTab = 'ratings' | 'complaints' | 'changes';

@Component({
  selector: 'app-ops-reviews',
  imports: [FormsModule, OpsDrawerComponent],
  template: `
    <div class="filters">
      <button class="chip" type="button" [class.active]="tab === 'ratings'" (click)="setTab('ratings')">التقييمات</button>
      <button class="chip" type="button" [class.active]="tab === 'complaints'" (click)="setTab('complaints')">البلاغات</button>
      <button class="chip" type="button" [class.active]="tab === 'changes'" (click)="setTab('changes')">تعديلات الملف</button>
    </div>

    @if (tab === 'ratings') {
      <div class="filters">
        <button class="chip" type="button" [class.active]="ratingStatus === 'PENDING'" (click)="setRatingStatus('PENDING')">بانتظار المراجعة</button>
        <button class="chip" type="button" [class.active]="ratingStatus === 'APPROVED'" (click)="setRatingStatus('APPROVED')">معتمدة</button>
        <button class="chip" type="button" [class.active]="ratingStatus === 'REJECTED'" (click)="setRatingStatus('REJECTED')">مرفوضة</button>
      </div>
      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!ratings.length) {
        <p class="page-empty">لا توجد تقييمات في هذا التبويب.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>العميلة</th>
                <th>الخبيرة</th>
                <th>التقييم</th>
                <th>الملاحظة</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              @for (item of ratings; track item.id) {
                <tr [class.active]="selectedRating?.id === item.id" (click)="selectedRating = item">
                  <td><b>{{ item.customer.displayName }}</b></td>
                  <td>{{ item.provider.displayName }}</td>
                  <td>{{ stars(item.stars) }}</td>
                  <td class="clip">{{ clip(item.note) }}</td>
                  <td><span class="status {{ statusTone(item.status) }}">{{ statusAr(item.status) }}</span></td>
                  <td>{{ opsDate(item.createdAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <app-ops-drawer
        [open]="!!selectedRating"
        [title]="selectedRating ? selectedRating.customer.displayName + ' → ' + selectedRating.provider.displayName : ''"
        kicker="تقييم"
        (closed)="selectedRating = null"
      >
        @if (selectedRating; as item) {
          <p class="muted small">{{ item.customer.accountCode }} → {{ item.provider.accountCode }}</p>
          <p class="muted small">{{ opsDate(item.createdAt) }}</p>
          <p style="margin:12px 0;letter-spacing:2px;color:var(--copper-dark);font-size:18px">{{ stars(item.stars) }}</p>
          <p style="white-space:pre-wrap;line-height:1.8">{{ item.note || 'بدون ملاحظة' }}</p>
          @if (item.status === 'PENDING') {
            <textarea class="input" rows="2" placeholder="ملاحظة اختيارية" [(ngModel)]="ratingNotes[item.id]"></textarea>
            <div class="ops-drawer-actions">
              <button class="btn primary" type="button" (click)="reviewRating(item, true)">اعتماد</button>
              <button class="btn ghost" type="button" (click)="reviewRating(item, false)">رفض</button>
            </div>
          } @else {
            <p class="muted small">الحالة: {{ statusAr(item.status) }}</p>
          }
        }
      </app-ops-drawer>
    }

    @if (tab === 'complaints') {
      <div class="filters">
        <button class="chip" type="button" [class.active]="complaintStatus === 'OPEN'" (click)="setComplaintStatus('OPEN')">مفتوحة</button>
        <button class="chip" type="button" [class.active]="complaintStatus === 'ESCALATED'" (click)="setComplaintStatus('ESCALATED')">مصعّدة</button>
        <button class="chip" type="button" [class.active]="complaintStatus === 'CLOSED'" (click)="setComplaintStatus('CLOSED')">مغلقة</button>
      </div>
      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!complaints.length) {
        <p class="page-empty">لا توجد بلاغات في هذا التبويب.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>المبلِّغة</th>
                <th>ضد</th>
                <th>السبب</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              @for (item of complaints; track item.id) {
                <tr [class.active]="selectedComplaint?.id === item.id" (click)="selectedComplaint = item">
                  <td>
                    <b>{{ item.reporter.displayName }}</b>
                    <div class="muted small">{{ accountLabel(item.reporter.accountType) }}</div>
                  </td>
                  <td>{{ item.target?.displayName || item.targetRef || 'غير محدد' }}</td>
                  <td class="clip">{{ clip(item.reason) }}</td>
                  <td><span class="status {{ statusTone(item.status) }}">{{ complaintStatusAr(item.status) }}</span></td>
                  <td>{{ opsDate(item.createdAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <app-ops-drawer
        [open]="!!selectedComplaint"
        [title]="selectedComplaint?.reporter?.displayName || ''"
        kicker="بلاغ"
        (closed)="selectedComplaint = null"
      >
        @if (selectedComplaint; as item) {
          <p class="muted small">{{ accountLabel(item.reporter.accountType) }} · {{ item.reporter.accountCode }}</p>
          <p class="muted small">
            ضد {{ item.target?.displayName || item.targetRef || 'غير محدد' }}
            @if (item.target) {
              · {{ item.target.accountCode }}
            }
          </p>
          <p class="muted small">{{ opsDate(item.createdAt) }}</p>
          <p style="margin:14px 0;white-space:pre-wrap;line-height:1.8">{{ item.reason }}</p>
          @if (item.status !== 'CLOSED') {
            <textarea class="input" rows="2" placeholder="ملاحظة للمبلِّغة" [(ngModel)]="complaintNotes[item.id]"></textarea>
            <div class="ops-drawer-actions">
              @if (item.status === 'OPEN') {
                <button class="btn soft" type="button" (click)="patchComplaint(item, 'ESCALATED')">تصعيد</button>
              }
              <button class="btn primary" type="button" (click)="patchComplaint(item, 'CLOSED')">إغلاق</button>
            </div>
          } @else {
            <p class="muted small">مغلق</p>
          }
        }
      </app-ops-drawer>
    }

    @if (tab === 'changes') {
      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!changes.length) {
        <p class="page-empty">لا توجد طلبات تعديل معلّقة.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>الحساب</th>
                <th>النوع</th>
                <th>الحقل</th>
                <th>القيمة المطلوبة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              @for (item of changes; track item.id) {
                <tr [class.active]="selectedChange?.id === item.id" (click)="selectedChange = item">
                  <td><b>{{ item.user.displayName }}</b></td>
                  <td>{{ accountLabel(item.user.accountType) }}</td>
                  <td>{{ fieldLabel(item.field) }}</td>
                  <td class="clip">{{ clip(item.newValue) }}</td>
                  <td>{{ opsDate(item.createdAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <app-ops-drawer
        [open]="!!selectedChange"
        [title]="selectedChange?.user?.displayName || ''"
        [kicker]="selectedChange ? fieldLabel(selectedChange.field) : 'تعديل ملف'"
        (closed)="selectedChange = null"
      >
        @if (selectedChange; as item) {
          <p class="muted small">{{ accountLabel(item.user.accountType) }} · {{ item.user.accountCode }}</p>
          <p class="muted small">{{ opsDate(item.createdAt) }}</p>
          <p class="muted small" style="margin-top:14px">القيمة الحالية</p>
          <p style="margin:0 0 10px;word-break:break-word">{{ item.oldValue || '—' }}</p>
          <p class="muted small">القيمة المطلوبة</p>
          <p style="margin:0 0 14px;word-break:break-word">{{ item.newValue }}</p>
          <div class="ops-drawer-actions">
            <button class="btn primary" type="button" (click)="reviewChange(item, true)">اعتماد</button>
            <button class="btn ghost" type="button" (click)="reviewChange(item, false)">رفض</button>
          </div>
        }
      </app-ops-drawer>
    }
  `,
})
export class OpsReviewsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;
  readonly clip = clip;

  tab: ReviewTab = 'ratings';
  loading = true;
  ratings: OpsRating[] = [];
  complaints: OpsComplaint[] = [];
  changes: OpsProfileChange[] = [];
  selectedRating: OpsRating | null = null;
  selectedComplaint: OpsComplaint | null = null;
  selectedChange: OpsProfileChange | null = null;
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
    this.clearSelection();
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
    this.load();
  }

  setRatingStatus(status: string): void {
    this.ratingStatus = status;
    this.selectedRating = null;
    this.load();
  }

  setComplaintStatus(status: string): void {
    this.complaintStatus = status;
    this.selectedComplaint = null;
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

  complaintStatusAr(status: string): string {
    if (status === 'ESCALATED') {
      return 'مصعّد';
    }
    if (status === 'CLOSED') {
      return 'مغلق';
    }
    return 'مفتوح';
  }

  reviewRating(item: OpsRating, approve: boolean): void {
    this.api.opsReviewRating(item.id, approve, this.ratingNotes[item.id]).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد التقييم' : 'تم رفض التقييم');
        this.selectedRating = null;
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر مراجعة التقييم')),
    });
  }

  patchComplaint(item: OpsComplaint, status: 'CLOSED' | 'ESCALATED'): void {
    this.api.opsPatchComplaint(item.id, status, this.complaintNotes[item.id]).subscribe({
      next: () => {
        this.toast.show(status === 'CLOSED' ? 'تم إغلاق البلاغ' : 'تم تصعيد البلاغ');
        this.selectedComplaint = null;
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث البلاغ')),
    });
  }

  reviewChange(item: OpsProfileChange, approve: boolean): void {
    this.api.opsReviewChange(item.id, approve).subscribe({
      next: () => {
        this.toast.show(approve ? 'تم اعتماد التعديل' : 'تم رفض التعديل');
        this.selectedChange = null;
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر مراجعة التعديل')),
    });
  }

  private clearSelection(): void {
    this.selectedRating = null;
    this.selectedComplaint = null;
    this.selectedChange = null;
  }

  private load(): void {
    this.loading = true;
    if (this.tab === 'ratings') {
      this.api.opsRatings(this.ratingStatus).subscribe({
        next: (rows) => {
          this.ratings = newestFirst(rows);
          this.selectedRating = keepSelected(this.ratings, this.selectedRating);
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
          this.complaints = newestFirst(rows);
          this.selectedComplaint = keepSelected(this.complaints, this.selectedComplaint);
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
        this.changes = newestFirst(rows);
        this.selectedChange = keepSelected(this.changes, this.selectedChange);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل طلبات التعديل'));
      },
    });
  }
}
