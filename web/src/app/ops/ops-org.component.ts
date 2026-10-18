import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsOrgDepartment, OpsOrgTeam, OpsStaff } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { keepSelected } from './ops-ui';

const emptyDeptDraft = () => ({ nameAr: '', nameEn: '', sortOrder: 0 });
const emptyTeamDraft = () => ({ nameAr: '', nameEn: '', sortOrder: 0, leadUserId: '' });

@Component({
  selector: 'app-ops-org',
  imports: [FormsModule, RouterLink, OpsDrawerComponent, OpsModalComponent],
  template: `
    @if (!selected) {
      <div class="section-head">
        <div>
          <h2>الهيكل التنظيمي</h2>
          <p>كل قسم يتسع لأكثر من فريق. اربطي الموظفات بالفرق من حسابات موظفي المنصة.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn ghost" routerLink="/ops/staff">حسابات الموظفين</a>
          @if (canEditOrg) {
            <button class="btn primary" type="button" (click)="addingDept = true">+ إضافة قسم</button>
          }
        </div>
      </div>

      <app-ops-modal [open]="addingDept" title="إضافة قسم" kicker="الهيكل التنظيمي" (closed)="addingDept = false">
        <div class="form-grid">
          <div class="field">
            <label>الاسم *</label>
            <input class="input" [(ngModel)]="deptDraft.nameAr" placeholder="التشغيل" />
          </div>
          <div class="field">
            <label>الاسم الإنجليزي *</label>
            <input class="input" [(ngModel)]="deptDraft.nameEn" placeholder="Operations" />
          </div>
          <div class="field">
            <label>الترتيب</label>
            <input class="input" type="number" [(ngModel)]="deptDraft.sortOrder" />
          </div>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createDepartment()">إضافة القسم</button>
      </app-ops-modal>

      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!departments.length) {
        <p class="page-empty">لا توجد أقسام بعد.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>القسم</th>
                <th>الاسم الإنجليزي</th>
                <th>الفرق</th>
                <th>الموظفات</th>
                <th>الظهور</th>
              </tr>
            </thead>
            <tbody>
              @for (department of departments; track department.id) {
                <tr (click)="openDepartment(department)">
                  <td><b>{{ department.nameAr }}</b></td>
                  <td>{{ department.nameEn }}</td>
                  <td>{{ department.teams.length }}</td>
                  <td>{{ memberCount(department) }}</td>
                  <td>
                    <span class="status {{ department.isActive ? 'success' : 'error' }}">
                      {{ department.isActive ? 'ظاهر' : 'مخفي' }}
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
          <button class="text-link" type="button" (click)="closeDepartment()">→ رجوع للأقسام</button>
          <h2>{{ selected.nameAr }}</h2>
          <p>كل فريق تشغيل يحتوي على مدير وموظفات، ويمكن تحديد صلاحيات مستقلة لكل حساب.</p>
        </div>
        @if (canEditOrg) {
          <button class="btn primary" type="button" (click)="openAddTeam()">+ إضافة فريق</button>
        }
      </div>

      @if (canEditOrg) {
        <div class="form-grid" style="margin-bottom:18px">
          <div class="field">
            <label>الاسم *</label>
            <input class="input" [(ngModel)]="selected.nameAr" />
          </div>
          <div class="field">
            <label>الاسم الإنجليزي *</label>
            <input class="input" [(ngModel)]="selected.nameEn" />
          </div>
          <div class="field">
            <label>الترتيب</label>
            <input class="input" type="number" [(ngModel)]="selected.sortOrder" />
          </div>
        </div>
        <div class="ops-drawer-actions" style="margin:0 0 22px">
          <button class="btn primary" type="button" (click)="saveDepartment(selected)">حفظ القسم</button>
          <button class="btn ghost" type="button" (click)="toggleDepartment(selected)">
            {{ selected.isActive ? 'إخفاء' : 'إظهار' }}
          </button>
        </div>
      }

      @if (!selected.teams.length) {
        <p class="page-empty">لا توجد فرق في هذا القسم بعد.</p>
      } @else {
        <div class="org-teams">
          @for (team of selected.teams; track team.id) {
            <article class="org-team" [class.active]="selectedTeam?.id === team.id" (click)="selectedTeam = team">
              <h3>{{ team.nameAr }}</h3>
              <p class="meta">{{ team.memberCount }} حسابات تشغيلية</p>
              @if (!team.members.length) {
                <p class="muted small">لا توجد موظفات مربوطة بعد.</p>
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

    <app-ops-modal [open]="addingTeam" title="إضافة فريق" [kicker]="selected?.nameAr || ''" (closed)="addingTeam = false">
      <div class="form-grid">
        <div class="field">
          <label>الاسم *</label>
          <input class="input" [(ngModel)]="teamDraft.nameAr" placeholder="فريق التشغيل الأول" />
        </div>
        <div class="field">
          <label>الاسم الإنجليزي *</label>
          <input class="input" [(ngModel)]="teamDraft.nameEn" placeholder="Operations Team 1" />
        </div>
        <div class="field">
          <label>مديرة الفريق</label>
          <select class="input" [(ngModel)]="teamDraft.leadUserId">
            <option value="">بدون تحديد</option>
            @for (item of staff; track item.id) {
              <option [value]="item.id">{{ item.displayName }}</option>
            }
          </select>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createTeam()">إضافة الفريق</button>
    </app-ops-modal>

    <app-ops-drawer
      [open]="!!selectedTeam"
      [title]="selectedTeam?.nameAr || ''"
      kicker="فريق"
      (closed)="selectedTeam = null"
    >
      @if (selectedTeam; as team) {
        @if (canEditOrg) {
          <div class="form-grid">
            <div class="field">
              <label>الاسم *</label>
              <input class="input" [(ngModel)]="team.nameAr" />
            </div>
            <div class="field">
              <label>الاسم الإنجليزي *</label>
              <input class="input" [(ngModel)]="team.nameEn" />
            </div>
            <div class="field">
              <label>مديرة الفريق</label>
              <select class="input" [(ngModel)]="team.leadUserId">
                <option [ngValue]="null">بدون تحديد</option>
                @for (item of staff; track item.id) {
                  <option [value]="item.id">{{ item.displayName }}</option>
                }
              </select>
            </div>
          </div>
        }
        <div class="ops-drawer-actions">
          @if (canEditOrg) {
            <button class="btn primary" type="button" (click)="saveTeam(team)">حفظ الفريق</button>
            <button class="btn ghost" type="button" (click)="toggleTeam(team)">
              {{ team.isActive ? 'إخفاء' : 'إظهار' }}
            </button>
          }
          <a class="btn ghost" routerLink="/ops/staff" [queryParams]="{ teamId: team.id }">حسابات الفريق</a>
        </div>
      }
    </app-ops-drawer>
  `,
})
export class OpsOrgComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
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
    this.shell.set('الهيكل التنظيمي', 'أقسام وفرق موظفي المنصة');
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
    this.shell.set(department.nameAr, department.nameEn || 'فرق القسم');
  }

  closeDepartment(): void {
    this.selected = null;
    this.selectedTeam = null;
    this.shell.set('الهيكل التنظيمي', 'أقسام وفرق موظفي المنصة');
  }

  createDepartment(): void {
    if (this.deptDraft.nameAr.trim().length < 2 || this.deptDraft.nameEn.trim().length < 2) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
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
          this.toast.show('تمت إضافة القسم');
          this.deptDraft = emptyDeptDraft();
          this.addingDept = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة القسم')),
      });
  }

  saveDepartment(department: OpsOrgDepartment): void {
    if (department.nameAr.trim().length < 2 || department.nameEn.trim().length < 2) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
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
          this.shell.set(row.nameAr, row.nameEn || 'فرق القسم');
          this.toast.show('تم حفظ القسم');
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ القسم')),
      });
  }

  toggleDepartment(department: OpsOrgDepartment): void {
    this.api.opsPatchDepartment(department.id, { isActive: !department.isActive }).subscribe({
      next: (row) => {
        department.isActive = row.isActive;
        this.toast.show(row.isActive ? 'القسم ظاهر' : 'تم إخفاء القسم');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الظهور')),
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
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
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
          this.toast.show('تمت إضافة الفريق');
          this.teamDraft = emptyTeamDraft();
          this.addingTeam = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الفريق')),
      });
  }

  saveTeam(team: OpsOrgTeam): void {
    if (team.nameAr.trim().length < 2 || team.nameEn.trim().length < 2) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
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
          this.toast.show('تم حفظ الفريق');
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الفريق')),
      });
  }

  toggleTeam(team: OpsOrgTeam): void {
    this.api.opsPatchTeam(team.id, { isActive: !team.isActive }).subscribe({
      next: (row) => {
        team.isActive = row.isActive;
        this.toast.show(row.isActive ? 'الفريق ظاهر' : 'تم إخفاء الفريق');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الظهور')),
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
          this.shell.set(this.selected.nameAr, this.selected.nameEn || 'فرق القسم');
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الهيكل التنظيمي'));
      },
    });
  }
}
