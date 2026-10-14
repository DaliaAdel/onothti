import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage, isSaudiMobile, toMobile } from '../core/phone';
import type { OpsBannedPhone, OpsOrgDepartment, OpsOrgTeam, OpsPermission, OpsRole, OpsStaff } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { keepSelected, newestFirst, opsDate } from './ops-ui';

@Component({
  selector: 'app-ops-staff',
  imports: [FormsModule, RouterLink, OpsDrawerComponent, OpsModalComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>حسابات موظفي التشغيل والمالية</h2>
        <p>أضيفي مشغّلة واربطيها بفريق من الهيكل التنظيمي. المستخدمة الجديدة تؤكد OTP ثم تعيّن كلمة مرور جديدة.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn ghost" routerLink="/ops/org">الهيكل التنظيمي</a>
        <button class="btn primary" type="button" (click)="openAdd()">+ إضافة مستخدمة</button>
      </div>
    </div>

    <div class="filters">
      <button class="chip" type="button" [class.active]="departmentFilter === ''" (click)="setDepartmentFilter('')">الكل</button>
      @for (department of departments; track department.id) {
        <button class="chip" type="button" [class.active]="departmentFilter === department.id" (click)="setDepartmentFilter(department.id)">
          {{ department.nameAr }}
        </button>
      }
    </div>
    @if (departmentFilter && departmentTeams.length) {
      <div class="filters">
        <button class="chip" type="button" [class.active]="teamFilter === ''" (click)="teamFilter = ''">كل الفرق</button>
        @for (team of departmentTeams; track team.id) {
          <button class="chip" type="button" [class.active]="teamFilter === team.id" (click)="teamFilter = team.id">
            {{ team.nameAr }}
          </button>
        }
      </div>
    }

    <app-ops-modal [open]="adding" title="إضافة مستخدمة" kicker="حساب تشغيل جديد" (closed)="closeAdd()">
      <div class="form-grid">
        <div class="field">
          <label>الاسم</label>
          <input class="input" name="staffDisplayName" [(ngModel)]="draft.displayName" [ngModelOptions]="{standalone: true}" />
        </div>
        <div class="field">
          <label>الجوال</label>
          <input class="input" name="staffMobile" dir="ltr" [(ngModel)]="draft.mobile" placeholder="05xxxxxxxx" [ngModelOptions]="{standalone: true}" />
        </div>
        <div class="field">
          <label>نوع الحساب</label>
          <select class="input" name="staffRoleId" [(ngModel)]="draft.roleId" (ngModelChange)="onRoleChange()" [ngModelOptions]="{standalone: true}">
            <option value="">اختاري نوع الحساب</option>
            @for (role of roles; track role.id) {
              <option [value]="role.id">{{ role.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>القسم</label>
          <select class="input" name="staffDepartmentId" [(ngModel)]="draft.departmentId" (ngModelChange)="onDraftDepartmentChange()" [ngModelOptions]="{standalone: true}">
            <option value="">اختاري القسم</option>
            @for (department of departments; track department.id) {
              <option [value]="department.id">{{ department.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>الفريق</label>
          <select class="input" name="staffTeamId" [(ngModel)]="draft.teamId" [ngModelOptions]="{standalone: true}">
            <option value="">اختاري الفريق</option>
            @for (team of draftTeams; track team.id) {
              <option [value]="team.id">{{ team.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>المنصب</label>
          <input class="input" name="staffTitleAr" [(ngModel)]="draft.titleAr" placeholder="مدير التشغيل" [ngModelOptions]="{standalone: true}" />
        </div>
      </div>
      @if (selectedRole) {
        <p class="muted small" style="margin-top:10px">الصلاحيات: {{ permissionNames(selectedRole) }}</p>
      }
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" [disabled]="creating" (click)="create()">
        {{ creating ? 'جاري الإنشاء...' : 'إنشاء الحساب' }}
      </button>
    </app-ops-modal>

    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الجوال</th>
              <th>الرمز</th>
              <th>نوع الحساب</th>
              <th>المنصب</th>
              <th>الفريق</th>
              <th>الحالة</th>
              <th>كلمة المرور</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            @for (item of filteredStaff; track item.id) {
              <tr [class.active]="selectedStaff?.id === item.id" (click)="selectStaff(item)">
                <td><b>{{ item.displayName }}</b></td>
                <td dir="ltr">{{ item.mobile }}</td>
                <td>{{ item.accountCode }}</td>
                <td>{{ item.role?.nameAr || '—' }}</td>
                <td>{{ item.titleAr || item.role?.nameAr || '—' }}</td>
                <td>{{ teamLabel(item) }}</td>
                <td><span class="status {{ item.status === 'ACTIVE' ? 'success' : 'error' }}">{{ item.status === 'ACTIVE' ? 'نشطة' : 'موقوفة' }}</span></td>
                <td>
                  <span class="status {{ item.mustChangePassword ? 'warning' : 'success' }}">
                    {{ item.mustChangePassword ? 'بانتظار التعيين' : 'معيّنة' }}
                  </span>
                </td>
                <td>{{ opsDate(item.createdAt) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <app-ops-drawer
      [open]="!!selectedStaff"
      [title]="selectedStaff?.displayName || ''"
      [kicker]="selectedStaff?.role?.nameAr || 'مستخدمة تشغيل'"
      (closed)="selectedStaff = null"
    >
      @if (selectedStaff; as item) {
        <p class="muted small">{{ item.accountCode }} · <span dir="ltr">{{ item.mobile }}</span></p>
        <p class="muted small">{{ item.permissions.length }} صلاحية{{ item.customPermissions ? ' مخصّصة' : ' من نوع الحساب' }}</p>
        @if (item.mustChangePassword) {
          <p class="notice">عند أول دخول تؤكد رقمها بـ OTP ثم تضع كلمة مرور جديدة.</p>
        }
        <div class="field">
          <label>نوع الحساب</label>
          <select class="input" [(ngModel)]="roleById[item.id]">
            @for (role of roles; track role.id) {
              <option [value]="role.id">{{ role.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>القسم</label>
          <select class="input" [(ngModel)]="departmentById[item.id]" (ngModelChange)="onItemDepartmentChange(item)">
            @for (department of departments; track department.id) {
              <option [value]="department.id">{{ department.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>الفريق</label>
          <select class="input" [(ngModel)]="teamById[item.id]">
            @for (team of teamsFor(departmentById[item.id]); track team.id) {
              <option [value]="team.id">{{ team.nameAr }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>المنصب</label>
          <input class="input" [(ngModel)]="titleById[item.id]" placeholder="مدير التشغيل" />
        </div>
        <p class="muted small" style="margin:16px 0 8px">
          صلاحيات هذه المستخدمة
          @if (item.customPermissions) {
            · مخصّصة
          } @else {
            · من نوع الحساب
          }
        </p>
        @if (userMatrix[item.id]) {
          <div class="filters" style="margin:0">
            @for (perm of catalog; track perm.id) {
              <label class="chip" [class.active]="userMatrix[item.id][perm.code]">
                <input type="checkbox" [name]="'user-' + item.id + '-' + perm.code" [(ngModel)]="userMatrix[item.id][perm.code]" />
                {{ perm.nameAr }}
              </label>
            }
          </div>
        }
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveRole(item)">حفظ نوع الحساب والفريق</button>
          <button class="btn primary" type="button" (click)="saveUserPermissions(item)">حفظ الصلاحيات</button>
          @if (item.customPermissions) {
            <button class="btn ghost" type="button" (click)="resetUserPermissions(item)">إعادة لصلاحيات النوع</button>
          }
          <button class="btn ghost" type="button" (click)="resetPassword(item)">إعادة تعيين كلمة المرور</button>
          <button class="btn ghost" type="button" (click)="toggle(item)" [disabled]="item.id === meId">
            {{ item.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل' }}
          </button>
        </div>
      }
    </app-ops-drawer>

    <div class="section-head">
      <div>
        <h2>صلاحيات الأدوار</h2>
        <p>حددي ما الذي يراه ويفعله كل دور في لوحة  المعلومات. التغيير يطبّق من الجلسة التالية أو بعد تحديث الصفحة.</p>
      </div>
    </div>
    @if (!catalog.length) {
      <p class="muted small">جاري تحميل الصلاحيات...</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>نوع الحساب</th>
              <th>الرمز</th>
              <th>الصلاحيات</th>
            </tr>
          </thead>
          <tbody>
            @for (role of roles; track role.id) {
              <tr [class.active]="selectedRoleRow?.id === role.id" (click)="selectedRoleRow = role">
                <td><b>{{ role.nameAr }}</b></td>
                <td>{{ role.code }}</td>
                <td>{{ (role.permissions ?? []).length }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <app-ops-drawer
      [open]="!!selectedRoleRow"
      [title]="selectedRoleRow?.nameAr || ''"
      kicker="صلاحيات الحساب"
      (closed)="selectedRoleRow = null"
    >
      @if (selectedRoleRow; as role) {
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
          حفظ صلاحيات الحساب
        </button>
      }
    </app-ops-drawer>

    <div class="section-head">
      <div>
        <h2>أرقام محظورة</h2>
        <p>الرقم المحظور لا يستطيع إنشاء حساب جديد أو الدخول.</p>
      </div>
      <button class="btn primary" type="button" (click)="addingBan = true">+ حظر رقم</button>
    </div>
    <app-ops-modal [open]="addingBan" title="حظر رقم جوال" kicker="منع الدخول والتسجيل" (closed)="addingBan = false">
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
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="ban()">حظر الرقم</button>
    </app-ops-modal>
    @if (banned.length) {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الجوال</th>
              <th>السبب</th>
              <th>بواسطة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            @for (item of banned; track item.mobile) {
              <tr [class.active]="selectedBan?.mobile === item.mobile" (click)="selectedBan = item">
                <td dir="ltr"><b>{{ item.mobile }}</b></td>
                <td class="clip">{{ item.reason }}</td>
                <td>{{ item.createdBy?.displayName || '—' }}</td>
                <td>{{ opsDate(item.createdAt) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <app-ops-drawer
      [open]="!!selectedBan"
      [title]="selectedBan?.mobile || ''"
      kicker="رقم محظور"
      (closed)="selectedBan = null"
    >
      @if (selectedBan; as item) {
        <p class="muted small">{{ item.reason }}</p>
        <p class="muted small">{{ opsDate(item.createdAt) }} · {{ item.createdBy?.displayName || '' }}</p>
        <div class="ops-drawer-actions">
          <button class="btn ghost" type="button" (click)="unban(item.mobile)">رفع الحظر</button>
        </div>
      }
    </app-ops-drawer>
  `,
})
export class OpsStaffComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);

  readonly opsDate = opsDate;

  loading = true;
  staff: OpsStaff[] = [];
  selectedStaff: OpsStaff | null = null;
  selectedRoleRow: OpsRole | null = null;
  selectedBan: OpsBannedPhone | null = null;
  roles: OpsRole[] = [];
  catalog: OpsPermission[] = [];
  departments: OpsOrgDepartment[] = [];
  roleById: Record<string, string> = {};
  teamById: Record<string, string> = {};
  departmentById: Record<string, string> = {};
  titleById: Record<string, string> = {};
  matrix: Record<string, Record<string, boolean>> = {};
  userMatrix: Record<string, Record<string, boolean>> = {};
  draft = { displayName: '', mobile: '', roleId: '', departmentId: '', teamId: '', titleAr: '' };
  departmentFilter = '';
  teamFilter = '';
  adding = false;
  creating = false;
  addingBan = false;
  banDraft = { mobile: '', reason: '' };
  banned: OpsBannedPhone[] = [];
  meId = this.session.user()?.id ?? '';

  get selectedRole(): OpsRole | undefined {
    return this.roles.find((role) => role.id === this.draft.roleId);
  }

  get filteredStaff(): OpsStaff[] {
    return this.staff.filter((item) => {
      if (this.teamFilter) {
        return item.teamId === this.teamFilter;
      }
      if (this.departmentFilter) {
        return item.orgTeam?.department.id === this.departmentFilter;
      }
      return true;
    });
  }

  get departmentTeams(): OpsOrgTeam[] {
    return this.teamsFor(this.departmentFilter);
  }

  get draftTeams(): OpsOrgTeam[] {
    return this.teamsFor(this.draft.departmentId);
  }

  ngOnInit(): void {
    this.shell.set('مستخدمو التشغيل', 'أدوار وصلاحيات المشغّلات');
    const teamId = this.route.snapshot.queryParamMap.get('teamId');
    if (teamId) {
      this.teamFilter = teamId;
    }
    this.load();
  }

  teamsFor(departmentId: string): OpsOrgTeam[] {
    return this.departments.find((row) => row.id === departmentId)?.teams ?? [];
  }

  setDepartmentFilter(id: string): void {
    this.departmentFilter = id;
    this.teamFilter = '';
  }

  openAdd(): void {
    this.draft.displayName = '';
    this.draft.mobile = '';
    this.draft.roleId = this.roles[0]?.id ?? '';
    this.draft.departmentId = '';
    this.draft.teamId = '';
    this.draft.titleAr = '';
    this.onRoleChange();
    this.adding = true;
  }

  closeAdd(): void {
    if (!this.creating) {
      this.adding = false;
    }
  }

  onRoleChange(): void {
    const role = this.selectedRole;
    if (!role) {
      return;
    }
    const code = role.code === 'FINANCE' ? 'FINANCE' : role.code === 'ADMIN' ? 'ADMIN' : 'OPS';
    const department = this.departments.find((row) => row.code === code) ?? this.departments[0];
    this.draft.departmentId = department?.id ?? '';
    this.onDraftDepartmentChange();
  }

  onDraftDepartmentChange(): void {
    const teams = this.draftTeams;
    if (!teams.some((team) => team.id === this.draft.teamId)) {
      this.draft.teamId = teams[0]?.id ?? '';
    }
  }

  onItemDepartmentChange(item: OpsStaff): void {
    const teams = this.teamsFor(this.departmentById[item.id]);
    if (!teams.some((team) => team.id === this.teamById[item.id])) {
      this.teamById[item.id] = teams[0]?.id ?? '';
    }
  }

  selectStaff(item: OpsStaff): void {
    this.syncUserMatrixFor(item);
    this.selectedStaff = item;
  }

  teamLabel(item: OpsStaff): string {
    if (item.orgTeam?.nameAr) {
      return item.orgTeam.nameAr;
    }
    if (item.team === 'FINANCE') {
      return 'المالية';
    }
    if (item.team === 'ADMIN') {
      return 'الإدارة';
    }
    return 'التشغيل';
  }

  resetPassword(item: OpsStaff): void {
    this.api.opsPatchStaff(item.id, { resetPassword: true }).subscribe({
      next: (row) => {
        item.mustChangePassword = row.mustChangePassword;
        this.toast.show('سيُطلب منها OTP وتعيين كلمة مرور عند الدخول التالي');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إعادة تعيين كلمة المرور')),
    });
  }

  permissionNames(role: OpsRole): string {
    return (role.permissions ?? []).map((row) => row.permission.nameAr).join('، ') || 'بدون صلاحيات ظاهرة';
  }

  create(): void {
    const name = this.draft.displayName.trim();
    const mobile = toMobile(this.draft.mobile);
    if (name.length < 2) {
      this.toast.show('أدخلي الاسم (حرفين على الأقل)');
      return;
    }
    if (!isSaudiMobile(mobile)) {
      this.toast.show('أدخلي جوالًا سعوديًا من 10 أرقام يبدأ بـ 05');
      return;
    }
    if (!this.draft.roleId) {
      this.toast.show(this.roles.length ? 'اختاري نوع الحساب' : 'جاري تحميل أنواع الحساب، حاولِي بعد لحظات');
      return;
    }
    if (!this.draft.teamId) {
      this.onRoleChange();
    }
    this.creating = true;
    this.api
      .opsCreateStaff({
          displayName: this.draft.displayName.trim(),
          mobile,
          roleId: this.draft.roleId,
          teamId: this.draft.teamId || undefined,
          titleAr: this.draft.titleAr.trim() || undefined,
        })
      .subscribe({
        next: () => {
          this.creating = false;
          this.toast.show('تمت إضافة المستخدمة. ستؤكد OTP ثم تعيّن كلمة مرور عند أول دخول.');
          this.draft.displayName = '';
          this.draft.mobile = '';
          this.draft.roleId = '';
          this.draft.departmentId = '';
          this.draft.teamId = '';
          this.draft.titleAr = '';
          this.adding = false;
          this.load();
        },
        error: (err) => {
          this.creating = false;
          this.toast.show(apiMessage(err, 'تعذر إضافة المستخدمة'));
        },
      });
  }

  saveRole(item: OpsStaff): void {
    const roleId = this.roleById[item.id];
    if (!roleId) {
      return;
    }
    this.api
      .opsPatchStaff(item.id, {
        roleId,
        teamId: this.teamById[item.id] || item.teamId || undefined,
        titleAr: this.titleById[item.id] ?? item.titleAr ?? '',
      })
      .subscribe({
      next: (row) => {
        this.applyStaffRow(item, row);
        this.toast.show('تم تحديث نوع الحساب والفريق');
        if (item.id === this.meId) {
          this.session.patchUser({ permissions: row.permissions, roleCode: row.role?.code, roleNameAr: row.role?.nameAr });
        }
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تحديث نوع الحساب')),
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

  saveUserPermissions(item: OpsStaff): void {
    const selected = this.userMatrix[item.id] ?? {};
    const permissionCodes = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([code]) => code);
    this.api.opsPatchStaffPermissions(item.id, { permissionCodes }).subscribe({
      next: (row) => {
        this.applyStaffRow(item, row);
        this.toast.show('تم حفظ صلاحيات ' + item.displayName);
        if (item.id === this.meId) {
          this.session.patchUser({ permissions: row.permissions });
        }
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ صلاحيات المستخدمة')),
    });
  }

  resetUserPermissions(item: OpsStaff): void {
    this.api.opsPatchStaffPermissions(item.id, { resetToRole: true }).subscribe({
      next: (row) => {
        this.applyStaffRow(item, row);
        this.toast.show('رجعت صلاحيات نوع الحساب');
        if (item.id === this.meId) {
          this.session.patchUser({ permissions: row.permissions });
        }
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إعادة الصلاحيات')),
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
        const codes = (row.permissions ?? []).map((entry) => entry.permission.code);
        for (const item of this.staff) {
          if (item.role?.id === role.id && !item.customPermissions) {
            item.permissions = codes;
            this.syncUserMatrixFor(item);
            if (this.selectedStaff?.id === item.id) {
              this.selectedStaff = { ...this.selectedStaff, permissions: codes };
            }
          }
        }
        this.toast.show('تم حفظ صلاحيات ' + role.nameAr);
        const me = this.session.user();
        if (me?.roleCode === role.code) {
          const mine = this.staff.find((entry) => entry.id === this.meId);
          if (!mine?.customPermissions) {
            this.session.patchUser({ permissions: codes });
          }
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
        this.addingBan = false;
        this.loadBanned();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حظر الرقم')),
    });
  }

  unban(mobile: string): void {
    this.api.opsUnbanPhone(mobile).subscribe({
      next: () => {
        this.toast.show('تم رفع الحظر');
        this.selectedBan = null;
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
        this.syncUserMatrix();
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
        this.staff = newestFirst(rows);
        this.selectedStaff = keepSelected(this.staff, this.selectedStaff);
        for (const row of rows) {
          this.roleById[row.id] = row.role?.id ?? '';
          this.teamById[row.id] = row.teamId ?? '';
          this.departmentById[row.id] = row.orgTeam?.department.id ?? '';
          this.titleById[row.id] = row.titleAr ?? '';
        }
        this.syncUserMatrix();
        if (this.teamFilter && !this.departmentFilter) {
          const teamDept = this.staff.find((row) => row.teamId === this.teamFilter)?.orgTeam?.department.id;
          if (teamDept) {
            this.departmentFilter = teamDept;
          }
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل المستخدمين'));
      },
    });
    this.loadBanned();
    this.api.opsOrg().subscribe({
      next: (rows) => {
        this.departments = rows;
        if (this.draft.roleId) {
          this.onRoleChange();
        }
        if (this.teamFilter && !this.departmentFilter) {
          const department = rows.find((row) => row.teams.some((team) => team.id === this.teamFilter));
          if (department) {
            this.departmentFilter = department.id;
          }
        }
      },
      error: () => undefined,
    });
  }

  private loadBanned(): void {
    this.api.opsBannedPhones().subscribe({
      next: (rows) => {
        this.banned = newestFirst(rows);
        this.selectedBan = this.selectedBan
          ? this.banned.find((row) => row.mobile === this.selectedBan?.mobile) ?? null
          : null;
      },
      error: () => undefined,
    });
  }

  private applyStaffRow(item: OpsStaff, row: OpsStaff): void {
    item.role = row.role;
    item.permissions = row.permissions;
    item.customPermissions = row.customPermissions;
    item.team = row.team;
    item.teamId = row.teamId;
    item.titleAr = row.titleAr;
    item.orgTeam = row.orgTeam;
    this.staff = this.staff.map((entry) => (entry.id === row.id ? { ...entry, ...row } : entry));
    this.selectedStaff = this.selectedStaff?.id === row.id ? { ...this.selectedStaff, ...row } : this.selectedStaff;
    this.syncUserMatrixFor(row);
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

  private syncUserMatrix(): void {
    if (!this.catalog.length) {
      return;
    }
    for (const item of this.staff) {
      this.syncUserMatrixFor(item);
    }
  }

  private syncUserMatrixFor(item: OpsStaff): void {
    const current = new Set(item.permissions ?? []);
    this.userMatrix[item.id] ??= {};
    for (const perm of this.catalog) {
      this.userMatrix[item.id][perm.code] = current.has(perm.code);
    }
  }
}
