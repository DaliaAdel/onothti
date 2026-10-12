import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage, displayPhone } from '../core/phone';
import type { OpsStaff } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { opsDate } from './ops-ui';

@Component({
  selector: 'app-ops-profile',
  imports: [FormsModule],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>الملف الشخصي</h2>
        <p>بيانات الحساب الوظيفي والأمني.</p>
      </div>
    </div>
    @if (!me) {
      <p class="loading">جاري التحميل...</p>
    } @else {
      <div class="grid two">
        <article class="card form-card">
          <h3 style="margin:0 0 12px;color:var(--plum)">بيانات الحساب</h3>
          <div class="form-grid">
            <div class="field">
              <label>اسم الموظفة</label>
              <input class="input" [(ngModel)]="displayName" />
            </div>
            <div class="field">
              <label>الجوال</label>
              <input class="input" dir="ltr" [value]="displayPhone(me.mobile)" disabled />
            </div>
            <div class="field">
              <label>الرمز</label>
              <input class="input" [value]="me.accountCode" disabled />
            </div>
            <div class="field">
              <label>الدور</label>
              <input class="input" [value]="me.role?.nameAr || '—'" disabled />
            </div>
            <div class="field">
              <label>الفريق</label>
              <input class="input" [value]="me.orgTeam?.nameAr || teamLabel(me.team)" disabled />
            </div>
            <div class="field">
              <label>الحالة</label>
              <input class="input" [value]="me.status === 'ACTIVE' ? 'نشط' : 'موقوف'" disabled />
            </div>
          </div>
          <p class="muted small" style="margin-top:12px">
            آخر نشاط: {{ me.lastActiveAt ? opsDate(me.lastActiveAt) : '—' }}
          </p>
          <button class="btn primary" style="margin-top:14px" type="button" (click)="save()">حفظ الاسم</button>
        </article>
        <article class="card form-card">
          <h3 style="margin:0 0 12px;color:var(--plum)">تغيير كلمة المرور</h3>
          <div class="field">
            <label>كلمة المرور الحالية</label>
            <input class="input" type="password" [(ngModel)]="currentPassword" autocomplete="current-password" />
          </div>
          <div class="field">
            <label>كلمة المرور الجديدة</label>
            <input class="input" type="password" [(ngModel)]="newPassword" autocomplete="new-password" />
          </div>
          <div class="field">
            <label>تأكيد كلمة المرور</label>
            <input class="input" type="password" [(ngModel)]="confirm" autocomplete="new-password" />
          </div>
          <button class="btn primary" style="margin-top:14px" type="button" (click)="changePassword()">حفظ كلمة المرور</button>
        </article>
      </div>
    }
  `,
})
export class OpsProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);
  readonly opsDate = opsDate;
  readonly displayPhone = displayPhone;

  me: OpsStaff | null = null;
  displayName = '';
  currentPassword = '';
  newPassword = '';
  confirm = '';

  ngOnInit(): void {
    this.shell.set('الملف الشخصي', 'بيانات حساب التشغيل');
    this.api.opsMe().subscribe({
      next: (me) => {
        this.me = me;
        this.displayName = me.displayName;
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحميل الملف')),
    });
  }

  teamLabel(team: string): string {
    if (team === 'FINANCE') {
      return 'فريق المالية';
    }
    if (team === 'ADMIN') {
      return 'الإدارة';
    }
    return 'فريق التشغيل';
  }

  save(): void {
    const displayName = this.displayName.trim();
    if (displayName.length < 2) {
      this.toast.show('الاسم لا يقل عن حرفين');
      return;
    }
    this.api.opsPatchMe({ displayName }).subscribe({
      next: (me) => {
        this.me = me;
        this.session.patchUser({ displayName: me.displayName });
        this.toast.show('تم حفظ الاسم');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الاسم')),
    });
  }

  changePassword(): void {
    if (this.newPassword.length < 8) {
      this.toast.show('كلمة المرور لا تقل عن 8 أحرف');
      return;
    }
    if (this.newPassword !== this.confirm) {
      this.toast.show('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }
    this.api.changeStaffPassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.currentPassword = '';
        this.newPassword = '';
        this.confirm = '';
        this.toast.show('تم حفظ كلمة المرور');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير كلمة المرور')),
    });
  }
}
