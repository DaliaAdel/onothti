import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsRole, OpsStaff } from '../core/models';
import { LocaleService } from '../core/locale.service';
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
          <a class="text-link back" routerLink="/ops/staff">{{ locale.t('ops.perm.back') }}</a>
          <h2>{{ staff.displayName }}</h2>
          <p>
            {{ locale.localizedName(staff.role, locale.t('ops.perm.noRole')) }}
            @if (staff.customPermissions) {
              · {{ locale.t('ops.perm.custom') }}
            } @else {
              · {{ locale.t('ops.perm.fromTemplate') }}
            }
          </p>
        } @else {
          <h2>{{ locale.t('ops.perms.title') }}</h2>
          <p>{{ locale.t('ops.perm.intro') }}</p>
        }
      </div>
      <div class="ops-drawer-actions" style="margin:0">
        <button class="btn ghost" type="button" (click)="resetCurrent()">
          {{ staff ? locale.t('ops.perm.resetStaff') : locale.t('ops.perm.resetRole') }}
        </button>
        <button class="btn primary" type="button" [disabled]="saving || !canSave()" (click)="save()">{{ locale.t('ui.save') }}</button>
      </div>
    </div>
    @if (loading) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else {
      @if (!staff) {
        <div class="filters">
          @for (role of roles; track role.id) {
            <button class="chip" type="button" [class.active]="selectedRole?.id === role.id" (click)="selectRole(role)">
              {{ locale.localizedName(role) }}
            </button>
          }
        </div>
      }
      @if (canSave()) {
        <div class="perm-cards">
          @for (group of groups; track group.key) {
            <section class="perm-card">
              <div class="perm-card-head">
                <h3>{{ locale.tf('ops.perm.groupTitle', { name: locale.t('ops.perm.g.' + group.key) }) }}</h3>
                <p>{{ locale.t('ops.perm.h.' + group.key) }}</p>
              </div>
              @for (perm of group.items; track perm.code) {
                <label class="perm-row" [class.on]="picked(perm.code)">
                  <span>{{ locale.t('ops.perm.' + perm.code) }}</span>
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
  readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);

  readonly groups = this.buildGroups();
  readonly matrixCodes = PERMISSION_MATRIX.permissions.map((row) => row.code);

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
      this.shell.set('ops.perms.user', 'ops.perms.userSub');
      forkJoin({
        roles: this.api.opsRoles(),
        staff: this.api.opsStaffById(staffId),
      }).subscribe({
        next: ({ roles, staff: row }) => {
          this.roles = this.sortRoles(roles);
          this.staff = row;
          this.applyFromRoles();
          this.applyFromStaff(row);
          this.shell.set(row.displayName, this.locale.localizedName(row.role, this.locale.t('ops.perms.userSub')));
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, this.locale.t('ops.perm.toast.loadStaffFail')));
        },
      });
      return;
    }

    this.shell.set('ops.perms.title', 'ops.perms.sub');
    this.api.opsRoles().subscribe({
      next: (roles) => {
        this.roles = this.sortRoles(roles);
        this.applyFromRoles();
        this.selectedRole = this.roles[0] ?? null;
        if (this.selectedRole) {
          this.shell.set('ops.perms.title', this.locale.localizedName(this.selectedRole));
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.perm.toast.loadFail')));
      },
    });
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
    this.shell.set('ops.perms.title', this.locale.localizedName(role));
  }

  resetCurrent(): void {
    if (this.staff) {
      this.saving = true;
      this.api.opsPatchStaffPermissions(this.staff.id, { resetToRole: true }).subscribe({
        next: (row) => {
          this.applyStaffResult(row);
          this.saving = false;
          this.toast.show(this.locale.t('ops.perm.toast.reset'));
        },
        error: (err) => {
          this.saving = false;
          this.toast.show(apiMessage(err, this.locale.t('ops.perm.toast.resetFail')));
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
        this.toast.show(this.locale.tf('ops.perm.toast.savedRole', { name: this.locale.localizedName(row) }));
      },
      error: (err) => {
        this.saving = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.perm.toast.saveFail')));
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
        this.toast.show(this.locale.tf('ops.perm.toast.savedStaff', { name: row.displayName }));
      },
      error: (err) => {
        this.saving = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.perm.toast.saveStaffFail')));
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

  private groupKey(code: string): string {
    const prefix = code.split('-')[0];
    const map: Record<string, string> = {
      ACC: 'staff',
      PRO: 'content',
      USR: 'users',
      CAT: 'catalog',
      PKG: 'packages',
      FIN: 'finance',
      RAT: 'ratings',
      TKT: 'tickets',
      NOT: 'notify',
      REP: 'reports',
      SEC: 'sec',
    };
    return map[prefix] ?? prefix.toLowerCase();
  }

  private buildGroups(): { key: string; items: PermissionMatrixItem[] }[] {
    const groups: { key: string; items: PermissionMatrixItem[] }[] = [];
    for (const perm of PERMISSION_MATRIX.permissions) {
      const key = this.groupKey(perm.code);
      const last = groups[groups.length - 1];
      if (!last || last.key !== key) {
        groups.push({ key, items: [perm] });
      } else {
        last.items.push(perm);
      }
    }
    return groups;
  }
}
