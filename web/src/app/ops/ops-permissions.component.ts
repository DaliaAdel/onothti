import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsRole, OpsStaff } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { canManageRolePermissionSettings, matrixCodeIsOn, mergeMatrixCodes } from '../core/staff-permissions';
import { PERMISSION_MATRIX, type PermissionMatrixItem } from './permission-matrix.data';

@Component({
  selector: 'app-ops-permissions',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="section-head">
      <div>
        @if (staff) {
          <a class="text-link back" routerLink="/ops/staff">→ رجوع لحسابات الموظفين</a>
          <h2>{{ staff.displayName }}</h2>
          <p>
            {{ staff.role?.nameAr || 'بدون منصب' }}
            @if (staff.customPermissions) {
              · صلاحيات مخصّصة
            } @else {
              · من قالب المنصب
            }
          </p>
        } @else {
          <h2>الصلاحيات</h2>
          <p>اختاري المنصب ثم فعّلي الصلاحيات لكل مجموعة. الموظفة الجديدة تأخذ قالب منصبها.</p>
        }
      </div>
      <div class="ops-drawer-actions" style="margin:0">
        <button class="btn ghost" type="button" (click)="resetCurrent()">
          {{ staff ? 'إعادة لصلاحيات المنصب' : 'استعادة الافتراضي' }}
        </button>
        <button class="btn primary" type="button" [disabled]="saving || !canSave()" (click)="save()">حفظ</button>
      </div>
    </div>
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else {
      @if (!staff) {
        <div class="filters">
          @for (role of roles; track role.id) {
            <button class="chip" type="button" [class.active]="selectedRole?.id === role.id" (click)="selectRole(role)">
              {{ role.nameAr }}
            </button>
          }
        </div>
      }
      @if (canSave()) {
        <div class="perm-cards">
          @for (group of groups; track group.name) {
            <section class="perm-card">
              <div class="perm-card-head">
                <h3>صلاحيات {{ group.name }}</h3>
                <p>{{ hintOf(group.name) }}</p>
              </div>
              @for (perm of group.items; track perm.code) {
                <label class="perm-row" [class.on]="picked(perm.code)">
                  <span>{{ perm.nameAr }}</span>
                  <span class="perm-toggle">
                    <input type="checkbox" [name]="toggleName(perm.code)" [(ngModel)]="currentGrid[perm.code]" />
                    <i></i>
                  </span>
                </label>
              }
            </section>
          }
        </div>
      }
    }
  `,
})
export class OpsPermissionsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  readonly groups = this.buildGroups();
  readonly matrixCodes = PERMISSION_MATRIX.permissions.map((row) => row.code);
  readonly hints: Record<string, string> = {
    'حسابات الموظفين': 'إنشاء حسابات المنصة وفرقها وتعديل صلاحياتها.',
    'اعتماد الملفات والمحتوى': 'مراجعة واعتماد الاسم والصورة والنبذة وأعمال الحساب.',
    'قرارات حسابات المستخدمين': 'تفعيل الحساب أو تقييده أو حظر الرقم وفق النطاق.',
    'خدمات المنصة والمدن': 'إدارة الخدمات الرئيسية والفرعية والمناطق.',
    'الباقات والحملات': 'عرض الباقات وتشغيل الحملات وتعديل المزايا والأسعار.',
    'التحويلات والفواتير': 'مراجعة إثبات السداد ومطابقة المبلغ وإدخال الفاتورة.',
    'التقييمات والاعتراضات': 'عرض التقييمات واعتمادها أو حجبها قبل النشر.',
    'الطلبات ومسار العمل': 'استعراض الطلبات والرد عليها وتصعيدها حتى الإغلاق.',
    'الإشعارات والتواصل': 'إرسال إشعار فردي أو جماعي للخبيرة أو العميلة.',
    'التقارير وسجل التدقيق': 'عرض تقارير التشغيل والمالية وسجل الإجراءات.',
    'ضوابط لا تمنح كصلاحيات': 'قيود لا تُفعَّل كصلاحية تشغيلية ممنوحة.',
  };

  roles: OpsRole[] = [];
  selectedRole: OpsRole | null = null;
  staff: OpsStaff | null = null;
  grid: Record<string, Record<string, boolean>> = {};
  staffGrid: Record<string, boolean> = {};
  loading = true;
  saving = false;

  ngOnInit(): void {
    this.resetDefaults();
    const staffId = this.route.snapshot.paramMap.get('id');
    if (staffId) {
      this.shell.set('صلاحيات الموظفة', 'تعديل صلاحيات الحساب');
      forkJoin({
        roles: this.api.opsRoles(),
        staff: this.api.opsStaffById(staffId),
      }).subscribe({
        next: ({ roles, staff: row }) => {
          this.roles = this.sortRoles(roles);
          this.staff = row;
          this.applyFromRoles();
          this.applyFromStaff(row);
          this.shell.set(row.displayName, row.role?.nameAr || 'صلاحيات الحساب');
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر تحميل صلاحيات الحساب'));
        },
      });
      return;
    }

    this.shell.set('الصلاحيات', 'تفعيل صلاحيات كل منصب حسب المجموعة');
    this.api.opsRoles().subscribe({
      next: (roles) => {
        this.roles = this.sortRoles(roles);
        this.applyFromRoles();
        this.selectedRole = this.roles[0] ?? null;
        if (this.selectedRole) {
          this.shell.set('الصلاحيات', this.selectedRole.nameAr);
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الصلاحيات'));
      },
    });
  }

  hintOf(group: string): string {
    return this.hints[group] || '';
  }

  canSave(): boolean {
    if (this.staff) {
      return true;
    }
    return canManageRolePermissionSettings(this.session.user()?.roleCode) && Boolean(this.selectedRole);
  }

  toggleName(code: string): string {
    return (this.staff?.id || this.selectedRole?.code || 'role') + '-' + code;
  }

  get currentGrid(): Record<string, boolean> {
    if (this.staff) {
      return this.staffGrid;
    }
    const code = this.selectedRole?.code ?? '';
    this.grid[code] ??= {};
    return this.grid[code];
  }

  picked(code: string): boolean {
    return this.currentGrid[code] === true;
  }

  selectRole(role: OpsRole): void {
    this.selectedRole = role;
    this.shell.set('الصلاحيات', role.nameAr);
  }

  resetCurrent(): void {
    if (this.staff) {
      this.saving = true;
      this.api.opsPatchStaffPermissions(this.staff.id, { resetToRole: true }).subscribe({
        next: (row) => {
          this.applyStaffResult(row);
          this.saving = false;
          this.toast.show('تم إعادة صلاحيات الحساب');
        },
        error: (err) => {
          this.saving = false;
          this.toast.show(apiMessage(err, 'تعذر إعادة الصلاحيات'));
        },
      });
      return;
    }
    const role = this.selectedRole;
    if (!role) {
      return;
    }
    this.grid[role.code] = {};
    for (const perm of PERMISSION_MATRIX.permissions) {
      this.grid[role.code][perm.code] = Boolean(perm.grants[role.code]);
    }
  }

  save(): void {
    if (this.staff) {
      this.saveStaff();
      return;
    }
    const role = this.selectedRole;
    if (!role) {
      return;
    }
    this.saving = true;
    this.api.opsPatchRolePermissions(role.id, this.codesFor(this.currentGrid, role.permissions)).subscribe({
      next: (row) => {
        this.selectedRole = row;
        this.roles = this.roles.map((item) => (item.id === row.id ? row : item));
        this.applyFromRoles();
        this.saving = false;
        this.toast.show('تم حفظ صلاحيات ' + row.nameAr);
      },
      error: (err) => {
        this.saving = false;
        this.toast.show(apiMessage(err, 'تعذر حفظ الصلاحيات'));
      },
    });
  }

  private saveStaff(): void {
    const staff = this.staff;
    if (!staff) {
      return;
    }
    this.saving = true;
    const current = staff.permissions.map((code) => ({ permission: { code } }));
    this.api.opsPatchStaffPermissions(staff.id, { permissionCodes: this.codesFor(this.staffGrid, current) }).subscribe({
      next: (row) => {
        this.applyStaffResult(row);
        this.saving = false;
        this.toast.show('تم حفظ صلاحيات ' + row.displayName);
      },
      error: (err) => {
        this.saving = false;
        this.toast.show(apiMessage(err, 'تعذر حفظ صلاحيات الحساب'));
      },
    });
  }

  private applyStaffResult(row: OpsStaff): void {
    this.staff = row;
    this.applyFromStaff(row);
    if (row.id === this.session.user()?.id) {
      this.session.patchUser({ permissions: row.permissions, roleCode: row.role?.code, roleNameAr: row.role?.nameAr });
    }
  }

  private codesFor(
    selected: Record<string, boolean>,
    current: { permission: { code: string } }[] | undefined,
  ): string[] {
    return mergeMatrixCodes(
      selected,
      this.matrixCodes,
      (current ?? []).map((row) => row.permission.code),
    );
  }

  private applyFromStaff(item: OpsStaff): void {
    const current = item.permissions ?? [];
    this.staffGrid = {};
    for (const perm of PERMISSION_MATRIX.permissions) {
      this.staffGrid[perm.code] = matrixCodeIsOn(perm.code, current);
    }
  }

  private resetDefaults(): void {
    this.grid = {};
    for (const role of PERMISSION_MATRIX.roles) {
      this.grid[role.code] = {};
      for (const perm of PERMISSION_MATRIX.permissions) {
        this.grid[role.code][perm.code] = Boolean(perm.grants[role.code]);
      }
    }
  }

  private applyFromRoles(): void {
    for (const role of this.roles) {
      const current = (role.permissions ?? []).map((row) => row.permission.code);
      const hasAnyGrant = current.length > 0;
      this.grid[role.code] ??= {};
      for (const perm of PERMISSION_MATRIX.permissions) {
        this.grid[role.code][perm.code] =
          matrixCodeIsOn(perm.code, current) || (!hasAnyGrant && Boolean(perm.grants[role.code]));
      }
    }
  }

  private sortRoles(roles: OpsRole[]): OpsRole[] {
    const order = new Map(PERMISSION_MATRIX.roles.map((row, index) => [row.code, index]));
    return [...roles].sort((a, b) => {
      const left = order.get(a.code);
      const right = order.get(b.code);
      if (left == null && right == null) {
        return a.nameAr.localeCompare(b.nameAr, 'ar');
      }
      if (left == null) {
        return 1;
      }
      if (right == null) {
        return -1;
      }
      return left - right;
    });
  }

  private buildGroups(): { name: string; items: PermissionMatrixItem[] }[] {
    const groups: { name: string; items: PermissionMatrixItem[] }[] = [];
    for (const perm of PERMISSION_MATRIX.permissions) {
      const last = groups[groups.length - 1];
      if (!last || last.name !== perm.groupAr) {
        groups.push({ name: perm.groupAr, items: [perm] });
      } else {
        last.items.push(perm);
      }
    }
    return groups;
  }
}
