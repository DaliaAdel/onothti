import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { LegalAudience, LegalKind, OpsLegalPage } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { keepSelected } from './ops-ui';

const emptyDraft = () => ({
  audience: 'CUSTOMER' as LegalAudience,
  kind: 'TERMS' as LegalKind,
  titleAr: '',
  bodyAr: '',
  isActive: true,
});

@Component({
  selector: 'app-ops-legal',
  imports: [FormsModule, OpsDrawerComponent, OpsModalComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.legal.heading') }}</h2>
        <p>{{ locale.t('ops.legal.intro') }}</p>
      </div>
      @if (canManage) {
        <button class="btn primary" type="button" (click)="openAdd()">{{ locale.t('ops.legal.add') }}</button>
      }
    </div>

    <app-ops-modal [open]="adding" [title]="locale.t('ops.legal.addTitle')" [kicker]="locale.t('ops.legal.addKicker')" (closed)="adding = false">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.audience') }}</label>
          <select class="input" [(ngModel)]="draft.audience">
            <option value="CUSTOMER">{{ locale.t('ops.legal.audience.customer') }}</option>
            <option value="PROVIDER">{{ locale.t('ops.legal.audience.provider') }}</option>
            <option value="STAFF">{{ locale.t('legal.audience.staff') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.kind') }}</label>
          <select class="input" [(ngModel)]="draft.kind">
            <option value="TERMS">{{ locale.t('ops.legal.kind.terms') }}</option>
            <option value="PRIVACY">{{ locale.t('ops.legal.kind.privacy') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.status') }}</label>
          <select class="input" [(ngModel)]="draft.isActive">
            <option [ngValue]="true">{{ locale.t('ui.active') }}</option>
            <option [ngValue]="false">{{ locale.t('ui.inactive') }}</option>
          </select>
        </div>
        <div class="field full">
          <label>{{ locale.t('ops.ui.title') }}</label>
          <input class="input" [(ngModel)]="draft.titleAr" />
        </div>
        <div class="field full">
          <label>{{ locale.t('ops.ui.body') }}</label>
          <textarea class="input" rows="8" [(ngModel)]="draft.bodyAr"></textarea>
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="create()">{{ locale.t('ops.legal.addSubmit') }}</button>
    </app-ops-modal>

    @if (loading) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else if (!pages.length) {
      <p class="page-empty">{{ locale.t('ops.legal.empty') }}</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>{{ locale.t('ops.ui.audience') }}</th>
              <th>{{ locale.t('ops.ui.kind') }}</th>
              <th>{{ locale.t('ops.ui.title') }}</th>
              <th>{{ locale.t('ops.legal.col.version') }}</th>
              <th>{{ locale.t('ops.ui.status') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of pages; track item.id) {
              <tr [class.active]="selected?.id === item.id" (click)="selected = item">
                <td><b>{{ audienceLabel(item.audience) }}</b></td>
                <td>{{ kindLabel(item.kind) }}</td>
                <td>{{ item.titleAr }}</td>
                <td>{{ item.version }}</td>
                <td>
                  <span class="status {{ item.isActive ? 'success' : 'error' }}">
                    {{ item.isActive ? locale.t('ui.active') : locale.t('ui.inactive') }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <app-ops-drawer
      [open]="!!selected"
      [title]="selected ? selected.titleAr : ''"
      [kicker]="selected ? audienceLabel(selected.audience) + ' · ' + kindLabel(selected.kind) : ''"
      (closed)="selected = null"
    >
      @if (selected; as item) {
        <div class="form-grid">
          <div class="field">
            <label>{{ locale.t('ops.ui.audience') }}</label>
            <select class="input" [(ngModel)]="item.audience">
              <option value="CUSTOMER">{{ locale.t('ops.legal.audience.customer') }}</option>
              <option value="PROVIDER">{{ locale.t('ops.legal.audience.provider') }}</option>
              <option value="STAFF">{{ locale.t('legal.audience.staff') }}</option>
            </select>
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.kind') }}</label>
            <select class="input" [(ngModel)]="item.kind">
              <option value="TERMS">{{ locale.t('ops.legal.kind.terms') }}</option>
              <option value="POLICIES">{{ locale.t('ops.legal.kind.policies') }}</option>
              <option value="PRIVACY">{{ locale.t('ops.legal.kind.privacy') }}</option>
              <option value="OTHER">{{ locale.t('ops.legal.kind.other') }}</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.title') }}</label>
          <input class="input" [(ngModel)]="item.titleAr" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.body') }}</label>
          <textarea class="input" rows="12" [(ngModel)]="item.bodyAr"></textarea>
        </div>
        @if (canManage) {
          <div class="ops-drawer-actions">
            <button class="btn primary" type="button" (click)="save(item)">{{ locale.t('ops.legal.save') }}</button>
            <button class="btn ghost" type="button" (click)="toggle(item)">
              {{ item.isActive ? locale.t('ops.legal.hide') : locale.t('ops.legal.show') }}
            </button>
          </div>
        }
      }
    </app-ops-drawer>
  `,
})
export class OpsLegalComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);

  get canManage(): boolean {
    return this.session.hasAnyPermission('LEGAL_MANAGE', 'RAT-05');
  }

  loading = true;
  adding = false;
  pages: OpsLegalPage[] = [];
  selected: OpsLegalPage | null = null;
  draft = emptyDraft();

  ngOnInit(): void {
    this.shell.set('ops.legal.title', 'ops.legal.sub');
    this.load();
  }

  audienceLabel(value: string): string {
    if (value === 'PROVIDER') {
      return this.locale.t('ops.legal.audience.provider');
    }
    if (value === 'STAFF') {
      return this.locale.t('legal.audience.staff');
    }
    return this.locale.t('ops.legal.audience.customer');
  }

  kindLabel(value: string): string {
    if (value === 'POLICIES') {
      return this.locale.t('ops.legal.kind.policies');
    }
    if (value === 'PRIVACY') {
      return this.locale.t('ops.legal.kind.privacy');
    }
    if (value === 'OTHER') {
      return this.locale.t('ops.legal.kind.other');
    }
    return this.locale.t('ops.legal.kind.terms');
  }

  openAdd(): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    this.draft = emptyDraft();
    this.adding = true;
  }

  create(): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    if (this.draft.titleAr.trim().length < 2 || this.draft.bodyAr.trim().length < 4) {
      this.toast.show(this.locale.t('ops.legal.needText'));
      return;
    }
    this.api.opsCreateLegal(this.draft).subscribe({
      next: (row) => {
        this.pages = [...this.pages, row];
        this.selected = row;
        this.adding = false;
        this.draft = emptyDraft();
        this.toast.show(this.locale.t('ops.legal.toast.added'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.legal.toast.addFail'))),
    });
  }

  save(item: OpsLegalPage): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    if (item.titleAr.trim().length < 2 || item.bodyAr.trim().length < 4) {
      this.toast.show(this.locale.t('ops.legal.needText'));
      return;
    }
    this.api
      .opsPatchLegal(item.id, {
        titleAr: item.titleAr,
        bodyAr: item.bodyAr,
        audience: item.audience,
        kind: item.kind,
      })
      .subscribe({
        next: (row) => {
          Object.assign(item, row);
          this.toast.show(this.locale.t('ops.legal.toast.saved'));
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.legal.toast.saveFail'))),
      });
  }

  toggle(item: OpsLegalPage): void {
    if (!this.canManage) {
      this.toast.show(this.locale.t('ops.ui.noPerm'));
      return;
    }
    this.api.opsPatchLegal(item.id, { isActive: !item.isActive }).subscribe({
      next: (row) => {
        Object.assign(item, row);
        this.toast.show(row.isActive ? this.locale.t('ops.legal.toast.active') : this.locale.t('ops.legal.toast.stopped'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.legal.toast.toggleFail'))),
    });
  }

  private load(): void {
    this.api.opsLegal().subscribe({
      next: (pages) => {
        this.pages = pages;
        this.selected = keepSelected(this.pages, this.selected);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.legal.toast.loadFail')));
      },
    });
  }
}
