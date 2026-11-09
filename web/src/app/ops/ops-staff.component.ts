import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage, isSaudiMobile, toMobile } from '../core/phone';
import type { OpsOrgDepartment, OpsOrgTeam, OpsRole, OpsStaff } from '../core/models';
import {
  ACC_CREATE,
  accCodeForRole,
  canManageRolePermissionSettings,
  permForStaffPermissions,
} from '../core/staff-permissions';
import { PERMISSION_MATRIX } from './permission-matrix.data';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { IconComponent } from '../shared/icon.component';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { keepSelected, newestFirst, opsDate } from './ops-ui';

@Component({
  selector: 'app-ops-staff',
  imports: [FormsModule, RouterLink, OpsDrawerComponent, OpsModalComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.staff.heading') }}</h2>
        <p>{{ locale.t('ops.staff.intro') }}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        @if (canOrg) {
          <a class="btn ghost" routerLink="/ops/org">{{ locale.t('ops.staff.orgLink') }}</a>
        }
        @if (canPerms) {
          <a class="btn ghost" routerLink="/ops/permissions">{{ locale.t('ops.staff.permsLink') }}</a>
        }
        @if (canCreateStaff) {
          <button class="btn primary" type="button" (click)="openAdd()">{{ locale.t('ops.staff.add') }}</button>
        }
      </div>
    </div>

    @if (canSeeAllStaff || departments.length > 1) {
      <div class="filters">
        @if (canSeeAllStaff) {
          <button class="chip" type="button" [class.active]="departmentFilter === ''" (click)="setDepartmentFilter('')">{{ locale.t('ops.ui.all') }}</button>
        }
        @for (department of departments; track department.id) {
          <button class="chip" type="button" [class.active]="departmentFilter === department.id" (click)="setDepartmentFilter(department.id)">
            {{ locale.localizedName(department) }}
          </button>
        }
      </div>
    }
    @if (departmentFilter && departmentTeams.length && (canSeeDepartmentStaff || departmentTeams.length > 1)) {
      <div class="filters">
        @if (canSeeDepartmentStaff) {
          <button class="chip" type="button" [class.active]="teamFilter === ''" (click)="teamFilter = ''">{{ locale.t('ops.staff.allTeams') }}</button>
        }
        @for (team of departmentTeams; track team.id) {
          <button class="chip" type="button" [class.active]="teamFilter === team.id" (click)="teamFilter = team.id">
            {{ locale.localizedName(team) }}
          </button>
        }
      </div>
    }

    <app-ops-modal [open]="adding" [title]="locale.t('ops.staff.addTitle')" [kicker]="locale.t('ops.staff.addKicker')" (closed)="closeAdd()">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.name') }}</label>
          <input class="input" name="staffDisplayName" [(ngModel)]="draft.displayName" [ngModelOptions]="{standalone: true}" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.mobile') }}</label>
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
          <label>{{ locale.t('ops.staff.accountType') }}</label>
          <select class="input" name="staffRoleId" [(ngModel)]="draft.roleId" (ngModelChange)="onRoleChange()" [ngModelOptions]="{standalone: true}">
            <option value="">{{ locale.t('ops.staff.pickType') }}</option>
            @for (role of creatableRoles; track role.id) {
              <option [value]="role.id">{{ locale.localizedName(role) }}</option>
            }
          </select>
        </div>
        @if (canSeeAllStaff || departments.length > 1) {
          <div class="field">
            <label>{{ locale.t('ops.ui.dept') }}</label>
            <select class="input" name="staffDepartmentId" [(ngModel)]="draft.departmentId" (ngModelChange)="onDraftDepartmentChange()" [ngModelOptions]="{standalone: true}" [disabled]="!canSeeAllStaff">
              <option value="">{{ locale.t('ops.staff.pickDept') }}</option>
              @for (department of departments; track department.id) {
                <option [value]="department.id">{{ locale.localizedName(department) }}</option>
              }
            </select>
          </div>
        }
        @if (canSeeDepartmentStaff || draftTeams.length > 1) {
          <div class="field">
            <label>{{ locale.t('ops.ui.team') }}</label>
            <select class="input" name="staffTeamId" [(ngModel)]="draft.teamId" [ngModelOptions]="{standalone: true}" [disabled]="!canSeeDepartmentStaff">
              <option value="">{{ locale.t('ops.staff.pickTeam') }}</option>
              @for (team of draftTeams; track team.id) {
                <option [value]="team.id">{{ locale.localizedName(team) }}</option>
              }
            </select>
          </div>
        }
        <div class="field">
          <label>{{ locale.t('ops.staff.jobTitle') }}</label>
          <input class="input" name="staffTitleAr" [(ngModel)]="draft.titleAr" [placeholder]="locale.t('ops.staff.titlePh')" [ngModelOptions]="{standalone: true}" />
        </div>
      </div>
      @if (selectedRole) {
        <p class="muted small" style="margin-top:10px">
          {{ locale.tf('ops.staff.roleHint', { name: locale.localizedName(selectedRole) }) }}
        </p>
      }
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" [disabled]="creating" (click)="create()">
        {{ creating ? locale.t('ops.ui.creating') : locale.t('ops.staff.create') }}
      </button>
    </app-ops-modal>

    @if (loading) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>{{ locale.t('ops.ui.name') }}</th>
              <th>{{ locale.t('ops.ui.mobile') }}</th>
              <th>{{ locale.t('ops.ui.code') }}</th>
              <th>{{ locale.t('ops.staff.accountType') }}</th>
              <th>{{ locale.t('ops.staff.jobTitle') }}</th>
              <th>{{ locale.t('ops.staff.col.perms') }}</th>
              <th>{{ locale.t('ops.ui.team') }}</th>
              <th>{{ locale.t('ops.ui.status') }}</th>
              <th>{{ locale.t('ops.staff.col.password') }}</th>
              <th>{{ locale.t('ops.ui.date') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of filteredStaff; track item.id) {
              <tr [class.active]="selectedStaff?.id === item.id" (click)="selectStaff(item)">
                <td><b>{{ item.displayName }}</b></td>
                <td dir="ltr">{{ item.mobile }}</td>
                <td>{{ item.accountCode }}</td>
                <td>{{ locale.localizedName(item.role) || '—' }}</td>
                <td>{{ item.titleAr || locale.localizedName(item.role) || '—' }}</td>
                <td (click)="openPermissions($event, item)">
                  @if (canEditPerms(item)) {
                    <span class="text-link">{{ item.customPermissions ? locale.t('ops.staff.custom') : locale.t('ops.staff.fromRole') }}</span>
                  } @else {
                    <span>{{ item.customPermissions ? locale.t('ops.staff.custom') : locale.t('ops.staff.fromRole') }}</span>
                  }
                </td>
                <td>{{ teamLabel(item) }}</td>
                <td><span class="status {{ item.status === 'ACTIVE' ? 'success' : 'error' }}">{{ item.status === 'ACTIVE' ? locale.t('ops.status.activeF') : locale.t('ops.status.stoppedF') }}</span></td>
                <td>
                  <span class="status {{ item.mustChangePassword ? 'warning' : 'success' }}">
                    {{ item.mustChangePassword ? locale.t('ops.staff.pwdWait') : locale.t('ops.staff.pwdSet') }}
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
      [kicker]="locale.localizedName(selectedStaff?.role, locale.t('ops.staff.kicker'))"
      (closed)="selectedStaff = null"
    >
      @if (selectedStaff; as item) {
        <p class="muted small">{{ item.accountCode }} · <span dir="ltr">{{ item.mobile }}</span></p>
        <p class="muted small">
          {{ item.customPermissions ? locale.tf('ops.staff.permCountCustom', { n: item.permissions.length }) : locale.tf('ops.staff.permCountRole', { n: item.permissions.length }) }}
        </p>
        @if (item.mustChangePassword) {
          <p class="notice">{{ locale.t('ops.staff.firstLogin') }}</p>
        }
        <div class="field">
          <label>{{ locale.t('ops.ui.name') }}</label>
          <input class="input" [name]="'staffName-' + item.id" [(ngModel)]="nameById[item.id]" [disabled]="!canManageRole(item)" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.staff.accountType') }}</label>
          <select class="input" [(ngModel)]="roleById[item.id]" [disabled]="!canManageRole(item)">
            @for (role of rolesFor(item); track role.id) {
              <option [value]="role.id">{{ locale.localizedName(role) }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.dept') }}</label>
          <select class="input" [(ngModel)]="departmentById[item.id]" (ngModelChange)="onItemDepartmentChange(item)" [disabled]="!canMoveStaff">
            @for (department of departments; track department.id) {
              <option [value]="department.id">{{ locale.localizedName(department) }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.team') }}</label>
          <select class="input" [(ngModel)]="teamById[item.id]" [disabled]="!canMoveStaff">
            @for (team of teamsFor(departmentById[item.id]); track team.id) {
              <option [value]="team.id">{{ locale.localizedName(team) }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.staff.jobTitle') }}</label>
          <input class="input" [(ngModel)]="titleById[item.id]" [placeholder]="locale.t('ops.staff.titlePh')" [disabled]="!canManageRole(item)" />
        </div>
        <div class="ops-drawer-actions">
          @if (canManageRole(item) || canMoveStaff) {
            <button class="btn primary" type="button" (click)="saveRole(item)">{{ locale.t('ops.staff.saveData') }}</button>
          }
          @if (canEditPerms(item)) {
            <button class="btn ghost" type="button" (click)="openPermissions($event, item)">{{ locale.t('ops.staff.accountPerms') }}</button>
          }
          @if (canManageRole(item)) {
            <button class="btn ghost" type="button" (click)="resetPassword(item)">{{ locale.t('ops.staff.resetPwd') }}</button>
          }
          @if (canSuspend) {
            <button class="btn ghost" type="button" (click)="toggle(item)" [disabled]="item.id === meId">
              {{ item.status === 'ACTIVE' ? locale.t('ops.ui.stop') : locale.t('ops.ui.enable') }}
            </button>
          }
        </div>
      }
    </app-ops-drawer>
  `,
})
export class OpsStaffComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  readonly locale = inject(LocaleService);

  readonly opsDate = opsDate;

  loading = true;
  staff: OpsStaff[] = [];
  selectedStaff: OpsStaff | null = null;
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
  mobileTouched = false;
  meId = this.session.user()?.id ?? '';

  get selectedRole(): OpsRole | undefined {
    return this.roles.find((role) => role.id === this.draft.roleId);
  }

  get draftMobileError(): string {
    return this.mobileErrorText(this.draft.mobile, this.mobileTouched);
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
    return canManageRolePermissionSettings(this.session.user()?.roleCode);
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
    this.shell.set('ops.staff.title', 'ops.staff.sub');
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
    if (item.orgTeam) {
      return this.locale.localizedName(item.orgTeam);
    }
    if (item.team === 'FINANCE') {
      return this.locale.t('ops.queue.finance');
    }
    if (item.team === 'ADMIN') {
      return this.locale.t('ops.queue.admin');
    }
    return this.locale.t('ops.queue.ops');
  }

  resetPassword(item: OpsStaff): void {
    this.api.opsPatchStaff(item.id, { resetPassword: true }).subscribe({
      next: (row) => {
        item.mustChangePassword = row.mustChangePassword;
        this.toast.show(this.locale.t('ops.staff.toast.reset'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.staff.toast.resetFail'))),
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

  create(): void {
    this.mobileTouched = true;
    const name = this.draft.displayName.trim();
    const mobile = toMobile(this.draft.mobile);
    if (name.length < 2) {
      this.toast.show(this.locale.t('ops.staff.needName'));
      return;
    }
    if (!isSaudiMobile(mobile)) {
      return;
    }
    if (!this.draft.roleId) {
      this.toast.show(this.roles.length ? this.locale.t('ops.staff.needRole') : this.locale.t('ops.staff.rolesLoading'));
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
          this.toast.show(this.locale.t('ops.staff.toast.created'));
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
          this.toast.show(apiMessage(err, this.locale.t('ops.staff.toast.createFail')));
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
      this.toast.show(this.locale.t('ops.staff.needName'));
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
        this.toast.show(this.locale.t('ops.staff.toast.saved'));
        if (item.id === this.meId) {
          this.session.patchUser({
            displayName: row.displayName,
            permissions: row.permissions,
            roleCode: row.role?.code,
            roleNameAr: row.role?.nameAr,
          });
        }
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.staff.toast.saveFail'))),
    });
  }

  toggle(item: OpsStaff): void {
    const status = item.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.api.opsPatchStaff(item.id, { status }).subscribe({
      next: (row) => {
        item.status = row.status;
        this.toast.show(row.status === 'ACTIVE' ? this.locale.t('ops.staff.toast.enabled') : this.locale.t('ops.staff.toast.stopped'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ui.statusFail'))),
    });
  }

  private mobileErrorText(raw: string, touched: boolean): string {
    const mobile = toMobile(raw);
    if (!mobile) {
      return touched ? this.locale.t('ops.ui.needMobile') : '';
    }
    if (isSaudiMobile(mobile)) {
      return '';
    }
    if (touched || mobile.length >= 10 || !mobile.startsWith('05')) {
      return this.locale.t('ops.ui.needSaudiMobile');
    }
    return '';
  }

  private load(): void {
    this.loading = true;
    this.api.opsRoles().subscribe({
      next: (roles) => {
        this.roles = this.sortRoles(roles);
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.staff.toast.rolesFail'))),
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
        this.toast.show(apiMessage(err, this.locale.t('ops.staff.toast.loadFail')));
      },
    });
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
