import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsTeamActivityRow } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-ops-activity',
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>نشاط فريق التشغيل</h2>
        <p>إجراءات اليوم حسب المستخدمة. المصدر سجل الأحداث.</p>
      </div>
    </div>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!rows.length) {
      <p class="page-empty">لا يوجد نشاط مسجّل اليوم بعد.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>المستخدمة</th>
              <th>الفريق</th>
              <th>ملفات وحسابات خبيرات</th>
              <th>طلبات</th>
              <th>حسابات المنصة</th>
              <th>أخرى</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            @for (item of rows; track item.actorId) {
              <tr>
                <td>
                  <b>{{ item.displayName }}</b>
                  <div class="muted small">{{ item.accountCode }}</div>
                </td>
                <td>{{ teamLabel(item.team) }}</td>
                <td>{{ item.media }}</td>
                <td>{{ item.tickets }}</td>
                <td>{{ item.accounts }}</td>
                <td>{{ item.other }}</td>
                <td><b>{{ item.total }}</b></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class OpsActivityComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  loading = true;
  rows: OpsTeamActivityRow[] = [];

  ngOnInit(): void {
    this.shell.set('نشاط الفريق', 'ما أنجزته الموظفات اليوم');
    this.api.opsTeamActivity().subscribe({
      next: (res) => {
        this.rows = res.rows;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل نشاط الفريق'));
      },
    });
  }

  teamLabel(team: string): string {
    if (team === 'FINANCE') {
      return 'المالية';
    }
    if (team === 'ADMIN') {
      return 'الإدارة';
    }
    return 'التشغيل';
  }
}
