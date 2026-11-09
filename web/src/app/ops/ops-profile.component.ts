import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage, displayPhone } from '../core/phone';
import type { OpsStaff } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { PasswordInputComponent } from '../shared/password-input.component';
import { opsDate } from './ops-ui';

@Component({
  selector: 'app-ops-profile',
  imports: [FormsModule, PasswordInputComponent],
  template: `
    <div class="section-head" style="margin-top:0">
      <div>
        <h2>{{ locale.t('ops.prof.heading') }}</h2>
        <p>{{ locale.t('ops.prof.intro') }}</p>
      </div>
    </div>
    @if (!me) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else {
      <div class="grid two">
        <article class="card form-card">
          <h3 style="margin:0 0 12px;color:var(--plum)">{{ locale.t('ops.prof.account') }}</h3>
          <div class="form-grid">
            <div class="field">
              <label>{{ locale.t('ops.prof.userName') }}</label>
              <input class="input" [(ngModel)]="displayName" />
            </div>
            <div class="field">
              <label>{{ locale.t('ops.ui.mobile') }}</label>
              <input class="input" dir="ltr" [value]="displayPhone(me.mobile)" disabled />
            </div>
            <div class="field">
              <label>{{ locale.t('ops.ui.code') }}</label>
              <input class="input" [value]="me.accountCode" disabled />
            </div>
            <div class="field">
              <label>{{ locale.t('ops.ui.role') }}</label>
              <input class="input" [value]="locale.localizedName(me.role) || '—'" disabled />
            </div>
            <div class="field">
              <label>{{ locale.t('ops.ui.team') }}</label>
              <input class="input" [value]="locale.localizedName(me.orgTeam) || teamLabel(me.team)" disabled />
            </div>
            <div class="field">
              <label>{{ locale.t('ops.ui.status') }}</label>
              <input class="input" [value]="me.status === 'ACTIVE' ? locale.t('ops.status.ACTIVE') : locale.t('ops.status.SUSPENDED')" disabled />
            </div>
          </div>
          <p class="muted small" style="margin-top:12px">
            {{ locale.tf('ops.prof.lastActive', { date: me.lastActiveAt ? opsDate(me.lastActiveAt) : '—' }) }}
          </p>
          <button class="btn primary" style="margin-top:14px" type="button" (click)="save()">{{ locale.t('ops.prof.saveName') }}</button>
        </article>
        <article class="card form-card">
          <h3 style="margin:0 0 12px;color:var(--plum)">{{ locale.t('ops.prof.changePwd') }}</h3>
          <div class="field">
            <label>{{ locale.t('ops.prof.currentPwd') }}</label>
            <app-password-input name="currentPassword" [(value)]="currentPassword" autocomplete="current-password" [required]="false" [minlength]="0" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.prof.newPwd') }}</label>
            <app-password-input name="newPassword" [(value)]="newPassword" autocomplete="new-password" [required]="false" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.prof.confirmPwd') }}</label>
            <app-password-input name="confirm" [(value)]="confirm" autocomplete="new-password" [required]="false" />
          </div>
          <button class="btn primary" style="margin-top:14px" type="button" (click)="changePassword()">{{ locale.t('ops.prof.savePwd') }}</button>
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
  readonly locale = inject(LocaleService);
  readonly opsDate = opsDate;
  readonly displayPhone = displayPhone;

  me: OpsStaff | null = null;
  displayName = '';
  currentPassword = '';
  newPassword = '';
  confirm = '';

  ngOnInit(): void {
    this.shell.set('ops.profile.title', 'ops.profile.sub');
    this.api.opsMe().subscribe({
      next: (me) => {
        this.me = me;
        this.displayName = me.displayName;
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.prof.toast.loadFail'))),
    });
  }

  teamLabel(team: string): string {
    if (team === 'FINANCE') {
      return this.locale.t('ops.prof.teamFinance');
    }
    if (team === 'ADMIN') {
      return this.locale.t('ops.prof.teamAdmin');
    }
    return this.locale.t('ops.prof.teamOps');
  }

  save(): void {
    const displayName = this.displayName.trim();
    if (displayName.length < 2) {
      this.toast.show(this.locale.t('ops.prof.needName'));
      return;
    }
    this.api.opsPatchMe({ displayName }).subscribe({
      next: (me) => {
        this.me = me;
        this.session.patchUser({ displayName: me.displayName });
        this.toast.show(this.locale.t('ops.prof.toast.saved'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.prof.toast.saveFail'))),
    });
  }

  changePassword(): void {
    if (this.newPassword.length < 8) {
      this.toast.show(this.locale.t('ops.prof.pwdShort'));
      return;
    }
    if (this.newPassword !== this.confirm) {
      this.toast.show(this.locale.t('ops.prof.pwdMismatch'));
      return;
    }
    this.api.changeStaffPassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.currentPassword = '';
        this.newPassword = '';
        this.confirm = '';
        this.toast.show(this.locale.t('ops.prof.toast.pwdSaved'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.prof.toast.pwdFail'))),
    });
  }
}
