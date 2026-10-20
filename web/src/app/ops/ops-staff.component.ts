import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage, isSaudiMobile, toMobile } from '../core/phone';
import type { OpsBannedPhone, OpsOrgDepartment, OpsOrgTeam, OpsRole, OpsStaff } from '../core/models';
import { ACC_CREATE, accCodeForRole, permForStaffPermissions } from '../core/staff-permissions';
import { PERMISSION_MATRIX } from './permission-matrix.data';
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
        @if (canOrg) {
          <a class="btn ghost" routerLink="/ops/org">الهيكل التنظيمي</a>
        }
        @if (canPerms) {
          <a class="btn ghost" routerLink="/ops/permissions">صلاحيات المناصب</a>
        }
        @if (canCreateStaff) {
          <button class="btn primary" type="button" (click)="openAdd()">+ إضافة مستخدمة</button>
        }
      </div>
    </div>

    @if (canSeeAllStaff || departments.length > 1) {
      <div class="filters">
        @if (canSeeAllStaff) {
          <button class="chip" type="button" [class.active]="departmentFilter === ''" (click)="setDepartmentFilter('')">الكل</button>
        }
        @for (department of departments; track department.id) {
          <button class="chip" type="button" [class.active]="departmentFilter === department.id" (click)="setDepartmentFilter(department.id)">
            {{ department.nameAr }}
          </button>
        }
      </div>
    }
    @if (departmentFilter && departmentTeams.length && (canSeeDepartmentStaff || departmentTeams.length > 1)) {
      <div class="filters">
        @if (canSeeDepartmentStaff) {
          <button class="chip" type="button" [class.active]="teamFilter === ''" (click)="teamFilter = ''">كل الفرق</button>
        }
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
          <input
            class="input"
            name="staffMobile"
            dir="ltr"
            [class.invalid]="!!draftMobileError"
            [ngModel]="draft.mobile"
            (ngModelChange)="onDraftMobileChange($event)"
            (paste)="onDraftMobilePaste($event)"
            (blur)="onDraftMobileBlur()"
            inputmode="numeric"
            maxlength="10"
            placeholder="05xxxxxxxx"
            autocomplete="tel"
            [ngModelOptions]="{standalone: true}"
          />
          @if (draftMobileError) {
            <p class="field-error">{{ draftMobileError }}</p>
          }
        </div>
        <div class="field">
          <label>نوع الحساب</label>
          <select class="input" name="staffRoleId" [(ngModel)]="draft.roleId" (ngModelChange)="onRoleChange()" [ngModelOptions]="{standalone: true}">
            <option value="">اختاري نوع الحساب</option>
            @for (role of creatableRoles; track role.id) {
              <option [value]="role.id">{{ role.nameAr }}</option>
            }
          </select>
        </div>
        @if (canSeeAllStaff || departments.length > 1) {
          <div class="field">
            <label>القسم</label>
            <select class="input" name="staffDepartmentId" [(ngModel)]="draft.departmentId" (ngModelChange)="onDraftDepartmentChange()" [ngModelOptions]="{standalone: true}" [disabled]="!canSeeAllStaff">
              <option value="">اختاري القسم</option>
              @for (department of departments; track department.id) {
                <option [value]="department.id">{{ department.nameAr }}</option>
              }
            </select>
          </div>
        }
        @if (canSeeDepartmentStaff || draftTeams.length > 1) {
          <div class="field">
            <label>الفريق</label>
            <select class="input" name="staffTeamId" [(ngModel)]="draft.teamId" [ngModelOptions]="{standalone: true}" [disabled]="!canSeeDepartmentStaff">
              <option value="">اختاري الفريق</option>
              @for (team of draftTeams; track team.id) {
                <option [value]="team.id">{{ team.nameAr }}</option>
              }
            </select>
          </div>
        }
        <div class="field">
          <label>المنصب</label>
          <input class="input" name="staffTitleAr" [(ngModel)]="draft.titleAr" placeholder="مدير التشغيل" [ngModelOptions]="{standalone: true}" />
        </div>
      </div>
      @if (selectedRole) {
        <p class="muted small" style="margin-top:10px">
          هتأخذ صلاحيات منصب {{ selectedRole.nameAr }}. تقدري تعدّليها بعد الإنشاء من صفحة الصلاحيات.
        </p>
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
              <th>الصلاحيات</th>
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
                <td (click)="openPermissions($event, item)">
                  @if (canEditPerms(item)) {
                    <span class="text-link">{{ item.customPermissions ? 'مخصّصة' : 'من المنصب' }}</span>
                  } @else {
                    <span>{{ item.customPermissions ? 'مخصّصة' : 'من المنصب' }}</span>
                  }
                </td>
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
        <p class="muted small">
          {{ item.permissions.length }} صلاحية{{ item.customPermissions ? ' مخصّصة' : ' من المنصب' }}
        </p>
        @if (item.mustChangePassword) {
          <p class="notice">عند أول دخول تؤكد رقمها بـ OTP ثم تضع كلمة مرور جديدة.</p>
        }
        <div class="field">
          <label>الاسم</label>
          <input class="input" [name]="'staffName-' + item.id" [(ngModel)]="nameById[item.id]" />
        </div>
        <div class="field">
          <label>نوع الحساب</label>
          <select class="input" [(ngModel)]="roleById[item.id]" [disabled]="!canManageRole(item)">
            @for (role of rolesFor(item); track role.id) {
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
        <div class="ops-drawer-actions">
          @if (canManageRole(item) || canMoveStaff) {
            <button class="btn primary" type="button" (click)="saveRole(item)">حفظ البيانات</button>
          }
          @if (canEditPerms(item)) {
            <button class="btn ghost" type="button" (click)="openPermissions($event, item)">صلاحيات الحساب</button>
          }
          @if (canManageRole(item)) {
            <button class="btn ghost" type="button" (click)="resetPassword(item)">إعادة تعيين كلمة المرور</button>
          }
          @if (canSuspend) {
            <button class="btn ghost" type="button" (click)="toggle(item)" [disabled]="item.id === meId">
              {{ item.status === 'ACTIVE' ? 'إيقاف' : 'تفعيل' }}
            </button>
          }
        </div>
      }
    </app-ops-drawer>

    @if (canBan) {
    <div class="section-head">
      <div>
        <h2>أرقام محظورة</h2>
        <p>الرقم المحظور لا يستطيع إنشاء حساب جديد أو الدخول.</p>
      </div>
      <button class="btn primary" type="button" (click)="openBan()">+ حظر رقم</button>
    </div>
    <app-ops-modal [open]="addingBan" title="حظر رقم جوال" kicker="منع الدخول والتسجيل" (closed)="closeBan()">
      <div class="form-grid">
        <div class="field">
          <label>الجوال</label>
          <input
            class="input"
            dir="ltr"
            [class.invalid]="!!banMobileError"
            [ngModel]="banDraft.mobile"
            (ngModelChange)="onBanMobileChange($event)"
            (paste)="onBanMobilePaste($event)"
            (blur)="onBanMobileBlur()"
            inputmode="numeric"
            maxlength="10"
            placeholder="05xxxxxxxx"
            autocomplete="tel"
            [ngModelOptions]="{standalone: true}"
          />
          @if (banMobileError) {
            <p class="field-error">{{ banMobileError }}</p>
          }
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
    }
  `,
})
export class OpsStaffComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);

  readonly opsDate = opsDate;

  loading = true;
  staff: OpsStaff[] = [];
  selectedStaff: OpsStaff | null = null;
  selectedBan: OpsBannedPhone | null = null;
  roles: OpsRole[] = [];
  departments: OpsOrgDepartment[] = [];
  roleById: Record<string, string> = {};
  teamById: Record<string, string> = {};
  departmentById: Record<string, string> = {};
  titleById: Record<string, string> = {};
  nameById: Record<string, string> = {};
  draft = { displayName: '', mobile: '', roleId: '', departmentId: '', teamId: '', titleAr: '' };
  departmentFilter = '';
  teamFilter = '';
  adding = false;
  creating = false;
  addingBan = false;
  mobileTouched = false;
  banMobileTouched = false;
  banDraft = { mobile: '', reason: '' };
  banned: OpsBannedPhone[] = [];
  meId = this.session.user()?.id ?? '';

  get selectedRole(): OpsRole | undefined {
    return this.roles.find((role) => role.id === this.draft.roleId);
  }

  get draftMobileError(): string {
    return this.mobileErrorText(this.draft.mobile, this.mobileTouched);
  }

  get banMobileError(): string {
    return this.mobileErrorText(this.banDraft.mobile, this.banMobileTouched);
  }

  get canCreateStaff(): boolean {
    return this.session.hasAnyPermission(...ACC_CREATE);
  }

  get canOrg(): boolean {
    return this.session.hasAnyPermission('ACC-10', 'ACC-11', 'ACC-12', 'ACC-13', 'ACC-18', 'ACC-19', 'ACC-20');
  }

  get canSeeAllStaff(): boolean {
    return this.session.hasExactPermission('ACC-18');
  }

  get canSeeDepartmentStaff(): boolean {
    return this.session.hasExactPermission('ACC-18', 'ACC-19');
  }

  get canPerms(): boolean {
    return this.session.hasAnyPermission('ACC-14', 'ACC-15');
  }

  get canBan(): boolean {
    return this.session.hasAnyPermission('USR-04');
  }

  get canSuspend(): boolean {
    return this.session.hasAnyPermission('ACC-16');
  }

  get canMoveStaff(): boolean {
    return this.session.hasAnyPermission('ACC-13', 'ACC-12');
  }

  get creatableRoles(): OpsRole[] {
    return this.roles.filter((role) => {
      const code = accCodeForRole(role.code);
      return code ? this.session.hasAnyPermission(code) : false;
    });
  }

  canManageRole(item: OpsStaff): boolean {
    const code = accCodeForRole(item.role?.code);
    return code ? this.session.hasAnyPermission(code) : false;
  }

  canEditPerms(item: OpsStaff): boolean {
    return this.session.hasAnyPermission(permForStaffPermissions(item.role?.code));
  }

  rolesFor(item: OpsStaff): OpsRole[] {
    const current = item.role ? [item.role] : [];
    const allowed = this.creatableRoles;
    const ids = new Set(allowed.map((role) => role.id));
    for (const role of current) {
      if (role.id && !ids.has(role.id)) {
        allowed.push(role);
      }
    }
    return allowed;
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
    if (this.canSeeDepartmentStaff) {
      this.teamFilter = '';
    }
  }

  openAdd(): void {
    this.mobileTouched = false;
    this.draft.displayName = '';
    this.draft.mobile = '';
    this.draft.roleId = this.creatableRoles[0]?.id ?? this.roles[0]?.id ?? '';
    this.draft.departmentId = this.departmentFilter;
    this.draft.teamId = this.teamFilter;
    this.draft.titleAr = '';
    if (this.canSeeAllStaff) {
      this.onRoleChange();
    } else {
      this.onDraftDepartmentChange();
    }
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
    const code = this.departmentCodeFor(role.code);
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
    this.selectedStaff = item;
  }

  openPermissions(event: Event, item: OpsStaff): void {
    event.stopPropagation();
    this.selectedStaff = null;
    void this.router.navigate(['/ops/permissions/staff', item.id]);
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

  onDraftMobileChange(value: string): void {
    this.draft.mobile = toMobile(value);
  }

  onDraftMobilePaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.draft.mobile = toMobile(event.clipboardData?.getData('text') ?? '');
  }

  onDraftMobileBlur(): void {
    this.mobileTouched = true;
  }

  onBanMobileChange(value: string): void {
    this.banDraft.mobile = toMobile(value);
  }

  onBanMobilePaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.banDraft.mobile = toMobile(event.clipboardData?.getData('text') ?? '');
  }

  onBanMobileBlur(): void {
    this.banMobileTouched = true;
  }

  openBan(): void {
    this.banMobileTouched = false;
    this.addingBan = true;
  }

  closeBan(): void {
    this.addingBan = false;
  }

  create(): void {
    this.mobileTouched = true;
    const name = this.draft.displayName.trim();
    const mobile = toMobile(this.draft.mobile);
    if (name.length < 2) {
      this.toast.show('أدخلي الاسم (حرفين على الأقل)');
      return;
    }
    if (!isSaudiMobile(mobile)) {
      return;
    }
    if (!this.draft.roleId) {
      this.toast.show(this.roles.length ? 'اختاري نوع الحساب' : 'جاري تحميل أنواع الحساب، حاولِي بعد لحظات');
      return;
    }
    if (!this.draft.teamId && this.canSeeAllStaff) {
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
        next: (row) => {
          this.creating = false;
          this.toast.show('تمت إضافة المستخدمة. راجعي صلاحيات منصبها');
          this.draft.displayName = '';
          this.draft.mobile = '';
          this.draft.roleId = '';
          this.draft.departmentId = '';
          this.draft.teamId = '';
          this.draft.titleAr = '';
          this.adding = false;
          void this.router.navigate(['/ops/permissions/staff', row.id]);
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
    const displayName = (this.nameById[item.id] ?? item.displayName ?? '').trim();
    if (displayName.length < 2) {
      this.toast.show('أدخلي الاسم (حرفين على الأقل)');
      return;
    }
    this.api
      .opsPatchStaff(item.id, {
        displayName,
        roleId,
        teamId: this.teamById[item.id] || item.teamId || undefined,
        titleAr: this.titleById[item.id] ?? item.titleAr ?? '',
      })
      .subscribe({
      next: (row) => {
        this.applyStaffRow(item, row);
        this.nameById[row.id] = row.displayName;
        this.toast.show('تم حفظ بيانات الحساب');
        if (item.id === this.meId) {
          this.session.patchUser({
            displayName: row.displayName,
            permissions: row.permissions,
            roleCode: row.role?.code,
            roleNameAr: row.role?.nameAr,
          });
        }
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ بيانات الحساب')),
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

  ban(): void {
    this.banMobileTouched = true;
    const mobile = toMobile(this.banDraft.mobile);
    if (!isSaudiMobile(mobile)) {
      return;
    }
    if (this.banDraft.reason.trim().length < 4) {
      this.toast.show('أدخلي سبب الحظر');
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

  private mobileErrorText(raw: string, touched: boolean): string {
    const mobile = toMobile(raw);
    if (!mobile) {
      return touched ? 'أدخلي رقم الجوال' : '';
    }
    if (isSaudiMobile(mobile)) {
      return '';
    }
    if (touched || mobile.length >= 10 || !mobile.startsWith('05')) {
      return 'أدخلي جوالًا سعوديًا من 10 أرقام يبدأ بـ 05';
    }
    return '';
  }

  private load(): void {
    this.loading = true;
    this.api.opsRoles().subscribe({
      next: (roles) => {
        this.roles = this.sortRoles(roles);
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
          this.nameById[row.id] = row.displayName ?? '';
        }
        this.applyScopeFilters();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل المستخدمين'));
      },
    });
    if (this.canBan) {
      this.loadBanned();
    }
    this.api.opsOrg().subscribe({
      next: (rows) => {
        this.departments = rows;
        if (this.draft.roleId && this.canSeeAllStaff) {
          this.onRoleChange();
        }
        this.applyScopeFilters();
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

  private applyScopeFilters(): void {
    const me = this.staff.find((row) => row.id === this.meId);
    const ownDept = me?.orgTeam?.department.id ?? this.session.user()?.orgTeam?.department.id ?? this.departments[0]?.id ?? '';
    const ownTeam = me?.teamId || me?.orgTeam?.id || this.session.user()?.teamId || this.session.user()?.orgTeam?.id || '';
    if (this.teamFilter && !this.departmentFilter) {
      const fromStaff = this.staff.find((row) => row.teamId === this.teamFilter)?.orgTeam?.department.id;
      const fromOrg = this.departments.find((row) => row.teams.some((team) => team.id === this.teamFilter))?.id;
      this.departmentFilter = fromStaff || fromOrg || ownDept;
    }
    if (!this.canSeeAllStaff && !this.departmentFilter && ownDept) {
      this.departmentFilter = ownDept;
    }
    if (!this.canSeeDepartmentStaff && !this.teamFilter && ownTeam) {
      this.teamFilter = ownTeam;
    }
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
  }

  private departmentCodeFor(roleCode: string): string {
    if (['AM', 'AL', 'AE', 'ADMIN'].includes(roleCode)) {
      return 'ADMIN';
    }
    if (['FM', 'FL', 'FE', 'FINANCE'].includes(roleCode)) {
      return 'FINANCE';
    }
    return 'OPS';
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
}
