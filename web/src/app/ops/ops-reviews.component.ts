import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsComplaint } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { clip, keepSelected, newestFirst, opsDate, statusTone } from './ops-ui';

@Component({
  selector: 'app-ops-reviews',
  imports: [FormsModule, OpsDrawerComponent],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>المراجعات</h2>
        <p>بلاغات العميلات والخبيرات. الاسم والصورة والنبذة والتقييم في الاعتمادات.</p>
      </div>
    </div>
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
        @if (item.status !== 'CLOSED' && (canEscalateComplaint || canCloseComplaint)) {
          <textarea class="input" rows="2" placeholder="ملاحظة للمبلِّغة" [(ngModel)]="complaintNotes[item.id]"></textarea>
          <div class="ops-drawer-actions">
            @if (item.status === 'OPEN' && canEscalateComplaint) {
              <button class="btn soft" type="button" (click)="patchComplaint(item, 'ESCALATED')">تصعيد</button>
            }
            @if (canCloseComplaint) {
              <button class="btn primary" type="button" (click)="patchComplaint(item, 'CLOSED')">إغلاق</button>
            }
          </div>
        } @else if (item.status === 'CLOSED') {
          <p class="muted small">مغلق</p>
        }
      }
    </app-ops-drawer>
  `,
})
export class OpsReviewsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  get canEscalateComplaint(): boolean {
    return this.session.hasAnyPermission('TKT-01', 'RAT-01');
  }

  get canCloseComplaint(): boolean {
    return this.session.hasPermission('TKT-02');
  }

  readonly opsDate = opsDate;
  readonly statusTone = statusTone;
  readonly clip = clip;

  loading = true;
  complaints: OpsComplaint[] = [];
  selectedComplaint: OpsComplaint | null = null;
  complaintStatus = 'OPEN';
  complaintNotes: Record<string, string> = {};

  ngOnInit(): void {
    this.shell.set('المراجعات', 'بلاغات المنصة');
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'ratings' || tab === 'changes') {
      void this.router.navigate(['/ops/approvals'], {
        queryParams: { kind: tab === 'ratings' ? 'rating' : null },
      });
      return;
    }
    this.load();
  }

  setComplaintStatus(status: string): void {
    this.complaintStatus = status;
    this.selectedComplaint = null;
    this.load();
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

  complaintStatusAr(status: string): string {
    if (status === 'ESCALATED') {
      return 'مصعّد';
    }
    if (status === 'CLOSED') {
      return 'مغلق';
    }
    return 'مفتوح';
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

  private load(): void {
    this.loading = true;
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
  }
}
