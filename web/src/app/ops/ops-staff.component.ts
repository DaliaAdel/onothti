import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage, isSaudiMobile, toMobile } from '../core/phone';
import type { OpsBannedPhone, OpsPermission, OpsRole, OpsStaff } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-ops-staff',
  imports: [FormsModule],
  template: `
    <div class="section-head">
      <div>
        <h2>مستخدمو التشغيل</h2>
        <p>أضيفي مشغّلة بدور وصلاحياته. الدخول برقم الجوال ورمز التحقق، بدون كلمة مرور.</p>
      </div>
    </div>

    <article class="card form-card" style="margin-bottom:22px">
      <h3 style="margin:0 0 12px;color:var(--plum)">إضافة مستخدمة</h3>
      <div class="form-grid">
        <div class="field">
          <label>الاسم</label>
          <input class="input" [(ngModel)]="draft.displayName" />
        </div>
        <div class="field">
          <label>الجوال</label>
          <input class="input" dir="ltr" [(ngModel)]="draft.mobile" placeholder="05xxxxxxxx" />
        </div>
        <div class="field">
          <label>الدور</label>
          <select class="input" [(ngModel)]="draft.roleId">
            <option value="">اختاري الدور</option>
            @for (role of roles; track role.id) {
              <option [value]="role.id">{{ role.nameAr }}</option>
            }
          </select>
        </div>
      </div>
      @if (selectedRole) {
        <p class="muted small" style="margin-top:10px">الصلاحيات: {{ permissionNames(selectedRole) }}</p>
      }
      <button class="btn primary" style="margin-top:14px" type="button" (click)="create()">إضافة</button>
    </article>

    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else {
      <div class="grid two">
        @for (item of staff; track item.id) {
          <article class="card">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <h3 style="margin:0;color:var(--plum)">{{ item.displayName }}</h3>
              <span class="badge" [style.opacity]="item.status === 'ACTIVE' ? '1' : '.45'">
                {{ item.status === 'ACTIVE' ? 'نشطة' : 'موقوفة' }}
              </span>
            </div>
            <p class="muted small">{{ item.accountCode }} · {{ item.mobile }} · {{ item.role?.nameAr }}</p>
            <p class="muted small" style="margin-top:8px">{{ item.permissions.length }} صلاحية مرتبطة بالدور</p>
            <div class="field" style="margin-top:12px">
              <label>الدور</label>
              <select class="input" [(ngModel)]="roleById[item.id]">
                @for (role of roles; track role.id) {
                  <option [value]="role.id">{{ role.nameAr }}</option>
                }
              </select>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
              <button class="btn primary" type="button" (click)="saveRole(item)">حفظ الدور</button>
              <button class="btn ghost" type="button" (click)="toggle(item)" [disabled]="item.id === meId">
                {{ item.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل' }}
              </button>
            </div>
          </article>
        }
      </div>
    }

    <div class="section-head">
      <div>
        <h2>صلاحيات الأدوار</h2>
        <p>حددي ما الذي يراه ويفعله كل دور في لوحة التشغيل. التغيير يطبّق من الجلسة التالية أو بعد تحديث الصفحة.</p>
      </div>
    </div>
    @if (!catalog.length) {
      <p class="muted small">جاري تحميل الصلاحيات...</p>
    } @else {
      <div class="grid two">
        @for (role of roles; track role.id) {
          <article class="card">
            <h3 style="margin:0 0 12px;color:var(--plum)">{{ role.nameAr }}</h3>
            @if (matrix[role.id]) {
              <div class="filters" style="margin:0">
                @for (perm of catalog; track perm.id) {
                  <label class="chip" [class.active]="matrix[role.id][perm.code]">
                    <input type="checkbox" [name]="role.id + '-' + perm.code" [(ngModel)]="matrix[role.id][perm.code]" />
                    {{ perm.nameAr }}
                  </label>
                }
              </div>
            }
            <button class="btn primary" style="margin-top:14px" type="button" (click)="savePermissions(role)">
              حفظ صلاحيات الدور
            </button>
          </article>
        }
      </div>
    }

    <div class="section-head">
      <div>
        <h2>أرقام محظورة</h2>
        <p>الرقم المحظور لا يستطيع إنشاء حساب جديد أو الدخول.</p>
      </div>
    </div>
    <article class="card form-card" style="margin-bottom:18px">
      <div class="form-grid">
        <div class="field">
          <label>الجوال</label>
          <input class="input" dir="ltr" [(ngModel)]="banDraft.mobile" placeholder="05xxxxxxxx" />
        </div>
        <div class="field">
          <label>السبب</label>
          <input class="input" [(ngModel)]="banDraft.reason" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:14px" type="button" (click)="ban()">حظر الرقم</button>
    </article>
    @if (banned.length) {
      <div class="grid two">
        @for (item of banned; track item.mobile) {
          <article class="card">
            <h3 style="margin:0 0 6px;color:var(--plum)" dir="ltr">{{ item.mobile }}</h3>
            <p class="muted small">{{ item.reason }}</p>
            <button class="btn ghost" style="margin-top:12px" type="button" (click)="unban(item.mobile)">رفع الحظر</button>
          </article>
        }
      </div>
    }
  `,
})
export class OpsStaffComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);

  loading = true;
  staff: OpsStaff[] = [];
  roles: OpsRole[] = [];
  catalog: OpsPermission[] = [];
  roleById: Record<string, string> = {};
  matrix: Record<string, Record<string, boolean>> = {};
  draft = { displayName: '', mobile: '', roleId: '' };
  banDraft = { mobile: '', reason: '' };
  banned: OpsBannedPhone[] = [];
  meId = this.session.user()?.id ?? '';

  get selectedRole(): OpsRole | undefined {
    return this.roles.find((role) => role.id === this.draft.roleId);
  }

  ngOnInit(): void {
    this.shell.set('مستخدمو التشغيل', 'أدوار وصلاحيات المشغّلات');
    this.load();
  }

  permissionNames(role: OpsRole): string {
    return (role.permissions ?? []).map((row) => row.permission.nameAr).join('، ') || 'بدون صلاحيات ظاهرة';
  }

  create(): void {
    const mobile = toMobile(this.draft.mobile);
    if (this.draft.displayName.trim().length < 2 || !isSaudiMobile(mobile) || !this.draft.roleId) {
      this.toast.show('أدخلي الاسم والجوال السعودي والدور');
      return;
    }
    this.api
      .opsCreateStaff({
        displayName: this.draft.displayName,
        mobile,
        roleId: this.draft.roleId,
      })
      .subscribe({
        next: () => {
          this.toast.show('تمت إضافة المستخدمة');
          this.draft = { displayName: '', mobile: '', roleId: '' };
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة المستخدمة')),
      });
  }

  saveRole(item: OpsStaff): void {
    const roleId = this.roleById[item.id];
    if (!roleId) {
      return;
    }
    this.api.opsPatchStaff(item.id, { roleId }).subscribe({
      next: (row) => {
        item.role = row.role;
        item.permissions = row.permissions;
        this.toast.show('تم تحديث الدور');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث الدور')),
    });
  }

  toggle(item: OpsStaff): void {
    const status = item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.api.opsPatchStaff(item.id, { status }).subscribe({
      next: (row) => {
        item.status = row.status;
        this.toast.show(row.status === 'ACTIVE' ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الحالة')),
    });
  }

  savePermissions(role: OpsRole): void {
    const selected = this.matrix[role.id] ?? {};
    const permissionCodes = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([code]) => code);
    this.api.opsPatchRolePermissions(role.id, permissionCodes).subscribe({
      next: (row) => {
        role.permissions = row.permissions;
        this.toast.show('تم حفظ صلاحيات ' + role.nameAr);
        if (this.session.user()?.roleCode === role.code) {
          this.session.patchUser({
            permissions: (row.permissions ?? []).map((item) => item.permission.code),
          });
        }
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الصلاحيات')),
    });
  }

  ban(): void {
    const mobile = toMobile(this.banDraft.mobile);
    if (!isSaudiMobile(mobile) || this.banDraft.reason.trim().length < 4) {
      this.toast.show('أدخلي جوالًا سعوديًا وسبب الحظر');
      return;
    }
    this.api.opsBanPhone({ mobile, reason: this.banDraft.reason }).subscribe({
      next: () => {
        this.toast.show('تم حظر الرقم');
        this.banDraft = { mobile: '', reason: '' };
        this.loadBanned();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حظر الرقم')),
    });
  }

  unban(mobile: string): void {
    this.api.opsUnbanPhone(mobile).subscribe({
      next: () => {
        this.toast.show('تم رفع الحظر');
        this.loadBanned();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر رفع الحظر')),
    });
  }

  private load(): void {
    this.loading = true;
    this.api.opsPermissions().subscribe({
      next: (catalog) => {
        this.catalog = catalog;
        this.syncMatrix();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحميل الصلاحيات')),
    });
    this.api.opsRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.syncMatrix();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحميل الأدوار')),
    });
    this.api.opsStaff().subscribe({
      next: (rows) => {
        this.staff = rows;
        for (const row of rows) {
          this.roleById[row.id] = row.role?.id ?? '';
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل المستخدمين'));
      },
    });
    this.loadBanned();
  }

  private loadBanned(): void {
    this.api.opsBannedPhones().subscribe({
      next: (rows) => (this.banned = rows),
      error: () => undefined,
    });
  }

  private syncMatrix(): void {
    if (!this.roles.length || !this.catalog.length) {
      return;
    }
    for (const role of this.roles) {
      const current = new Set((role.permissions ?? []).map((row) => row.permission.code));
      this.matrix[role.id] ??= {};
      for (const perm of this.catalog) {
        this.matrix[role.id][perm.code] = current.has(perm.code);
      }
    }
  }
}
