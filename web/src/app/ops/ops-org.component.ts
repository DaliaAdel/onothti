import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsOrgDepartment, OpsOrgTeam, OpsStaff } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { PositiveIntDirective } from './positive-int.directive';
import { keepSelected } from './ops-ui';

const emptyDeptDraft = () => ({ nameAr: '', nameEn: '', sortOrder: '' as number | '' });
const emptyTeamDraft = () => ({ nameAr: '', nameEn: '', sortOrder: 0, leadUserId: '' });

@Component({
  selector: 'app-ops-org',
  imports: [FormsModule, RouterLink, OpsDrawerComponent, OpsModalComponent, PositiveIntDirective],
  template: `
    @if (!selected) {
      <div class="section-head">
        <div>
          <h2>{{ locale.t('ops.org.heading') }}</h2>
          <p>{{ locale.t('ops.org.intro') }}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn ghost" routerLink="/ops/staff">{{ locale.t('ops.org.staffLink') }}</a>
          @if (canEditOrg) {
            <button class="btn primary" type="button" (click)="addingDept = true">{{ locale.t('ops.org.addDept') }}</button>
          }
        </div>
      </div>

      <app-ops-modal [open]="addingDept" [title]="locale.t('ops.org.addDeptTitle')" [kicker]="locale.t('ops.org.addDeptKicker')" (closed)="addingDept = false">
        <div class="form-grid">
          <div class="field">
            <label>{{ locale.t('ops.ui.nameReq') }}</label>
            <input class="input" [(ngModel)]="deptDraft.nameAr" [placeholder]="locale.t('ops.org.deptPh')" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
            <input class="input" [(ngModel)]="deptDraft.nameEn" [placeholder]="locale.t('ops.org.deptEnPh')" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.sort') }}</label>
            <input class="input" inputmode="numeric" positiveInt [(ngModel)]="deptDraft.sortOrder" />
          </div>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createDepartment()">{{ locale.t('ops.org.addDeptSubmit') }}</button>
      </app-ops-modal>

      @if (loading) {
        <p class="loading">{{ locale.t('ui.loading') }}</p>
      } @else if (!departments.length) {
        <p class="page-empty">{{ locale.t('ops.org.empty') }}</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>{{ locale.t('ops.org.col.dept') }}</th>
                <th>{{ locale.t('ops.ui.nameEn') }}</th>
                <th>{{ locale.t('ops.org.col.teams') }}</th>
                <th>{{ locale.t('ops.org.col.staff') }}</th>
                <th>{{ locale.t('ops.ui.appearance') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (department of departments; track department.id) {
                <tr (click)="openDepartment(department)">
                  <td><b>{{ locale.localizedName(department) }}</b></td>
                  <td>{{ department.nameEn }}</td>
                  <td>{{ department.teams.length }}</td>
                  <td>{{ memberCount(department) }}</td>
                  <td>
                    <span class="status {{ department.isActive ? 'success' : 'error' }}">
                      {{ department.isActive ? locale.t('ops.ui.shown') : locale.t('ops.ui.hiddenM') }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      <div class="section-head">
        <div>
          <button class="text-link back" type="button" (click)="closeDepartment()">{{ locale.t('ops.org.back') }}</button>
          <h2>{{ locale.localizedName(selected) }}</h2>
          <p>{{ locale.t('ops.org.deptHint') }}</p>
        </div>
        @if (canEditOrg) {
          <button class="btn primary" type="button" (click)="openAddTeam()">{{ locale.t('ops.org.addTeam') }}</button>
        }
      </div>

      @if (canEditOrg) {
        <div class="form-grid" style="margin-bottom:18px">
          <div class="field">
            <label>{{ locale.t('ops.ui.nameReq') }}</label>
            <input class="input" [(ngModel)]="selected.nameAr" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
            <input class="input" [(ngModel)]="selected.nameEn" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.sort') }}</label>
            <input class="input" inputmode="numeric" positiveInt [(ngModel)]="selected.sortOrder" />
          </div>
        </div>
        <div class="ops-drawer-actions" style="margin:0 0 22px">
          <button class="btn primary" type="button" (click)="saveDepartment(selected)">{{ locale.t('ops.org.saveDept') }}</button>
          <button class="btn ghost" type="button" (click)="toggleDepartment(selected)">
            {{ selected.isActive ? locale.t('ops.ui.hide') : locale.t('ops.ui.show') }}
          </button>
        </div>
      }

      @if (!selected.teams.length) {
        <p class="page-empty">{{ locale.t('ops.org.teamsEmpty') }}</p>
      } @else {
        <div class="org-teams">
          @for (team of selected.teams; track team.id) {
            <article class="org-team" [class.active]="selectedTeam?.id === team.id" (click)="selectedTeam = team">
              <h3>{{ locale.localizedName(team) }}</h3>
              <p class="meta">{{ locale.tf('ops.org.memberCount', { n: team.memberCount }) }}</p>
              @if (!team.members.length) {
                <p class="muted small">{{ locale.t('ops.org.noMembers') }}</p>
              }
              @for (member of team.members; track member.id) {
                <div class="org-member">
                  <span>{{ member.titleAr }}</span>
                  <b>{{ member.displayName }}</b>
                </div>
              }
            </article>
          }
        </div>
      }
    }

    <app-ops-modal [open]="addingTeam" [title]="locale.t('ops.org.addTeamTitle')" [kicker]="selected ? locale.localizedName(selected) : ''" (closed)="addingTeam = false">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.nameReq') }}</label>
          <input class="input" [(ngModel)]="teamDraft.nameAr" [placeholder]="locale.t('ops.org.teamPh')" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
          <input class="input" [(ngModel)]="teamDraft.nameEn" [placeholder]="locale.t('ops.org.teamEnPh')" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.org.lead') }}</label>
          <select class="input" [(ngModel)]="teamDraft.leadUserId">
            <option value="">{{ locale.t('ops.org.noLead') }}</option>
            @for (item of staff; track item.id) {
              <option [value]="item.id">{{ item.displayName }}</option>
            }
          </select>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createTeam()">{{ locale.t('ops.org.addTeamSubmit') }}</button>
    </app-ops-modal>

    <app-ops-drawer
      [open]="!!selectedTeam"
      [title]="selectedTeam ? locale.localizedName(selectedTeam) : ''"
      [kicker]="locale.t('ops.org.teamKicker')"
      (closed)="selectedTeam = null"
    >
      @if (selectedTeam; as team) {
        @if (canEditOrg) {
          <div class="form-grid">
            <div class="field">
              <label>{{ locale.t('ops.ui.nameReq') }}</label>
              <input class="input" [(ngModel)]="team.nameAr" />
            </div>
            <div class="field">
              <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
              <input class="input" [(ngModel)]="team.nameEn" />
            </div>
            <div class="field">
              <label>{{ locale.t('ops.org.lead') }}</label>
              <select class="input" [(ngModel)]="team.leadUserId">
                <option [ngValue]="null">{{ locale.t('ops.org.noLead') }}</option>
                @for (item of staff; track item.id) {
                  <option [value]="item.id">{{ item.displayName }}</option>
                }
              </select>
            </div>
          </div>
        }
        <div class="ops-drawer-actions">
          @if (canEditOrg) {
            <button class="btn primary" type="button" (click)="saveTeam(team)">{{ locale.t('ops.org.saveTeam') }}</button>
            <button class="btn ghost" type="button" (click)="toggleTeam(team)">
              {{ team.isActive ? locale.t('ops.ui.hide') : locale.t('ops.ui.show') }}
            </button>
          }
          <a class="btn ghost" routerLink="/ops/staff" [queryParams]="{ teamId: team.id }">{{ locale.t('ops.org.teamAccounts') }}</a>
        </div>
      }
    </app-ops-drawer>
  `,
})
export class OpsOrgComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);

  get canEditOrg(): boolean {
    return this.session.hasAnyPermission('ACC-10');
  }

  loading = true;
  addingDept = false;
  addingTeam = false;
  departments: OpsOrgDepartment[] = [];
  selected: OpsOrgDepartment | null = null;
  selectedTeam: OpsOrgTeam | null = null;
  staff: OpsStaff[] = [];
  deptDraft = emptyDeptDraft();
  teamDraft = emptyTeamDraft();

  ngOnInit(): void {
    this.shell.set('ops.org.title', 'ops.org.sub');
    this.api.opsStaff().subscribe({
      next: (rows) => (this.staff = rows),
      error: () => undefined,
    });
    this.load();
  }

  memberCount(department: OpsOrgDepartment): number {
    return department.teams.reduce((sum, team) => sum + (team.memberCount || 0), 0);
  }

  openDepartment(department: OpsOrgDepartment): void {
    this.selected = department;
    this.selectedTeam = null;
    this.shell.set(this.locale.localizedName(department), this.locale.t('ops.org.teams'));
  }

  closeDepartment(): void {
    this.selected = null;
    this.selectedTeam = null;
    this.shell.set('ops.org.title', 'ops.org.sub');
  }

  createDepartment(): void {
    if (this.deptDraft.nameAr.trim().length < 2 || this.deptDraft.nameEn.trim().length < 2) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsCreateDepartment({
        nameAr: this.deptDraft.nameAr.trim(),
        nameEn: this.deptDraft.nameEn.trim(),
        sortOrder: Number(this.deptDraft.sortOrder) || 0,
        isActive: true,
      })
      .subscribe({
        next: () => {
          this.toast.show(this.locale.t('ops.org.toast.deptAdded'));
          this.deptDraft = emptyDeptDraft();
          this.addingDept = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.org.toast.deptAddFail'))),
      });
  }

  saveDepartment(department: OpsOrgDepartment): void {
    if (department.nameAr.trim().length < 2 || department.nameEn.trim().length < 2) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsPatchDepartment(department.id, {
        nameAr: department.nameAr.trim(),
        nameEn: department.nameEn.trim(),
        sortOrder: Number(department.sortOrder) || 0,
      })
      .subscribe({
        next: (row) => {
          this.selected = row;
          this.shell.set(this.locale.localizedName(row), this.locale.t('ops.org.teams'));
          this.toast.show(this.locale.t('ops.org.toast.deptSaved'));
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.org.toast.deptSaveFail'))),
      });
  }

  toggleDepartment(department: OpsOrgDepartment): void {
    this.api.opsPatchDepartment(department.id, { isActive: !department.isActive }).subscribe({
      next: (row) => {
        department.isActive = row.isActive;
        this.toast.show(row.isActive ? this.locale.t('ops.org.toast.deptVisible') : this.locale.t('ops.org.toast.deptHidden'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ui.visibilityFail'))),
    });
  }

  openAddTeam(): void {
    this.teamDraft = emptyTeamDraft();
    this.addingTeam = true;
  }

  createTeam(): void {
    if (!this.selected) {
      return;
    }
    if (this.teamDraft.nameAr.trim().length < 2 || this.teamDraft.nameEn.trim().length < 2) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsCreateTeam({
        departmentId: this.selected.id,
        nameAr: this.teamDraft.nameAr.trim(),
        nameEn: this.teamDraft.nameEn.trim(),
        leadUserId: this.teamDraft.leadUserId || undefined,
        isActive: true,
      })
      .subscribe({
        next: () => {
          this.toast.show(this.locale.t('ops.org.toast.teamAdded'));
          this.teamDraft = emptyTeamDraft();
          this.addingTeam = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.org.toast.teamAddFail'))),
      });
  }

  saveTeam(team: OpsOrgTeam): void {
    if (team.nameAr.trim().length < 2 || team.nameEn.trim().length < 2) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsPatchTeam(team.id, {
        nameAr: team.nameAr.trim(),
        nameEn: team.nameEn.trim(),
        leadUserId: team.leadUserId || null,
      })
      .subscribe({
        next: () => {
          this.toast.show(this.locale.t('ops.org.toast.teamSaved'));
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.org.toast.teamSaveFail'))),
      });
  }

  toggleTeam(team: OpsOrgTeam): void {
    this.api.opsPatchTeam(team.id, { isActive: !team.isActive }).subscribe({
      next: (row) => {
        team.isActive = row.isActive;
        this.toast.show(row.isActive ? this.locale.t('ops.org.toast.teamVisible') : this.locale.t('ops.org.toast.teamHidden'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ui.visibilityFail'))),
    });
  }

  private load(): void {
    this.loading = true;
    this.api.opsOrg().subscribe({
      next: (rows) => {
        this.departments = rows;
        this.selected = keepSelected(this.departments, this.selected);
        this.selectedTeam = this.selected ? keepSelected(this.selected.teams, this.selectedTeam) : null;
        if (this.selected) {
          this.shell.set(this.locale.localizedName(this.selected), this.locale.t('ops.org.teams'));
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.org.toast.loadFail')));
      },
    });
  }
}
