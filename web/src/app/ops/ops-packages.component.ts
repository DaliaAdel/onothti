import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import { type CatalogPackage, type CatalogService, type OpsCampaign } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { LocaleDateDirective } from '../shared/locale-date.directive';
import { OpsModalComponent } from './ops-modal.component';
import { PositiveIntDirective } from './positive-int.directive';

@Component({
  selector: 'app-ops-packages',
  imports: [FormsModule, NgTemplateOutlet, OpsModalComponent, PositiveIntDirective, LocaleDateDirective],
  template: `
    <ng-template #packageForm>
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.name') }}</label>
          <input class="input" [(ngModel)]="draft.nameAr" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.durationMonths') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="draft.durationMonths" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.priceBefore') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="draft.priceBefore" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.discountPct') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="draft.discountPercent" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.priceAfter') }}</label>
          <input class="input" [value]="afterOf(draft.priceBefore, draft.discountPercent)" readonly />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.sort') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="draft.rank" />
        </div>
      </div>
    </ng-template>
    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.pkg.heading') }}</h2>
        <p>{{ canEditFeatures ? locale.t('ops.pkg.introEdit') : locale.t('ops.pkg.introView') }}</p>
      </div>
      @if (canEditFeatures) {
        <button class="btn primary" type="button" (click)="openAdd()">{{ locale.t('ops.pkg.add') }}</button>
      }
    </div>
    <app-ops-modal [open]="adding" [title]="locale.t('ops.pkg.addTitle')" [kicker]="locale.t('ops.pkg.addKicker')" (closed)="adding = false">
      <ng-container [ngTemplateOutlet]="packageForm" />
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="create()">{{ locale.t('ops.pkg.addSubmit') }}</button>
    </app-ops-modal>
    @if (loading) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else if (!regularPackages.length) {
      <p class="page-empty">{{ locale.t('ops.pkg.empty') }}</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>{{ locale.t('ops.pkg.col.pkg') }}</th>
              <th>{{ locale.t('ops.pkg.col.duration') }}</th>
              <th>{{ locale.t('ops.pkg.col.price') }}</th>
              <th>{{ locale.t('ops.ui.sort') }}</th>
              <th>{{ locale.t('ops.pkg.col.services') }}</th>
              <th>{{ locale.t('ops.ui.status') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of regularPackages; track item.id) {
              <tr (click)="openPackage(item)">
                <td><b>{{ locale.localizedName(item) }}</b></td>
                <td>{{ locale.tf('p.pkg.months', { n: item.durationMonths ?? 0 }) }}</td>
                <td>
                  @if (hasDiscount(item)) {
                    <del>{{ money(item.priceBefore) }} {{ locale.t('ui.sar') }}</del>
                    <b> {{ money(item.price) }} {{ locale.t('ui.sar') }}</b>
                    <span class="badge">{{ money(item.discountPercent) }}%</span>
                  } @else {
                    {{ money(item.price) }} {{ locale.t('ui.sar') }}
                  }
                </td>
                <td>{{ item.rank }}</td>
                <td class="pkg-tags-cell">
                  <div class="pkg-tags">
                    @for (name of previewServiceNames(item); track name) {
                      <span class="pkg-tag">{{ name }}</span>
                    }
                    @if (extraServiceCount(item); as extra) {
                      <span class="pkg-tag more">+{{ extra }}</span>
                    }
                    @if (!previewServiceNames(item).length) {
                      <span class="pkg-tag more">{{ locale.t('ops.pkg.noServices') }}</span>
                    }
                  </div>
                </td>
                <td><span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? locale.t('ops.status.enabled') : locale.t('ops.status.paused') }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.pkg.promoTitle') }}</h2>
        <p>{{ locale.t('ops.pkg.promoSub') }}</p>
      </div>
      @if (canAddPromo) {
        <button class="btn primary" type="button" (click)="openCampaignAdd()">{{ locale.t('ops.pkg.addPromo') }}</button>
      }
    </div>
    <app-ops-modal [open]="addingCampaign" [title]="locale.t('ops.pkg.addPromoTitle')" [kicker]="locale.t('ops.pkg.addPromoKicker')" (closed)="addingCampaign = false">
      <ng-container [ngTemplateOutlet]="packageForm" />
      <div class="form-grid" style="margin-top:16px">
        <div class="field">
          <label>{{ locale.t('ops.pkg.start') }}</label>
          <input class="input" type="date" [(ngModel)]="campaignDraft.startDate" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.end') }}</label>
          <input class="input" type="date" [(ngModel)]="campaignDraft.endDate" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.benefitDays') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="campaignDraft.benefitDays" />
        </div>
        <label class="ops-check" [class.on]="campaignDraft.clipToEndDate">
          <input type="checkbox" name="draftClipToEndDate" [(ngModel)]="campaignDraft.clipToEndDate" />
          <span class="ops-check-copy">
            <b>{{ locale.t('ops.pkg.clipTitle') }}</b>
            <small>{{ locale.t('ops.pkg.clipHint') }}</small>
          </span>
        </label>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createPromo()">{{ locale.t('ops.pkg.addPromoSubmit') }}</button>
    </app-ops-modal>
    @if (!promoPackages.length) {
      <p class="page-empty">{{ locale.t('ops.pkg.promoEmpty') }}</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>{{ locale.t('ops.pkg.col.pkg') }}</th>
              <th>{{ locale.t('ops.pkg.col.duration') }}</th>
              <th>{{ locale.t('ops.pkg.col.price') }}</th>
              <th>{{ locale.t('ops.pkg.start') }}</th>
              <th>{{ locale.t('ops.pkg.end') }}</th>
              <th>{{ locale.t('ops.pkg.col.benefit') }}</th>
              <th>{{ locale.t('ops.ui.status') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of promoPackages; track item.id) {
              <tr (click)="openPackage(item)">
                <td><b>{{ locale.localizedName(item) }}</b></td>
                <td>{{ locale.tf('p.pkg.months', { n: item.durationMonths ?? 0 }) }}</td>
                <td>
                  @if (hasDiscount(item)) {
                    <del>{{ money(item.priceBefore) }} {{ locale.t('ui.sar') }}</del>
                    <b> {{ money(item.price) }} {{ locale.t('ui.sar') }}</b>
                    <span class="badge">{{ money(item.discountPercent) }}%</span>
                  } @else {
                    {{ money(item.price) }} {{ locale.t('ui.sar') }}
                  }
                </td>
                <td>{{ campaignDate(item, 'startDate') }}</td>
                <td>{{ campaignDate(item, 'endDate') }}</td>
                <td>{{ campaignDays(item) }}</td>
                <td>
                  <span class="status {{ item.isActive ? 'success' : 'error' }}">{{ item.isActive ? locale.t('ops.status.enabled') : locale.t('ops.status.paused') }}</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="section-head">
      <div>
        <h2>{{ locale.t('ops.pkg.matrixTitle') }}</h2>
        <p>{{ locale.t('ops.pkg.matrixSub') }}</p>
      </div>
    </div>
    <div class="ops-table-wrap">
      <table class="ops-table">
        <thead>
          <tr>
            <th>{{ locale.t('ops.pkg.matrix.from') }}</th>
            <th>{{ locale.t('ops.pkg.matrix.to') }}</th>
            <th>{{ locale.t('ops.pkg.matrix.reason') }}</th>
            <th>{{ locale.t('ops.pkg.matrix.owner') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of stateMatrix; track row.from + row.to) {
            <tr>
              <td>{{ locale.t(row.from) }}</td>
              <td>{{ locale.t(row.to) }}</td>
              <td>{{ locale.t(row.reason) }}</td>
              <td>{{ locale.t(row.owner) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class OpsPackagesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  get canEditFeatures(): boolean {
    return this.session.hasPermission('PKG-04');
  }

  get canEditPrices(): boolean {
    return this.session.hasPermission('PKG-05');
  }

  get canCampaign(): boolean {
    return this.session.hasPermission('PKG-03');
  }

  get canAddPromo(): boolean {
    return this.canEditFeatures && this.canCampaign;
  }

  get regularPackages(): CatalogPackage[] {
    return this.packages.filter((item) => !item.isPromotional);
  }

  get promoPackages(): CatalogPackage[] {
    return this.packages.filter((item) => item.isPromotional);
  }

  packages: CatalogPackage[] = [];
  catalogServices: CatalogService[] = [];
  campaigns: OpsCampaign[] = [];
  loading = true;
  draft = { nameAr: '', durationMonths: 1, priceBefore: '' as number | '', discountPercent: '' as number | '', rank: 5 };
  adding = false;
  addingCampaign = false;
  campaignDraft = { startDate: '', endDate: '', benefitDays: 30, clipToEndDate: true };
  readonly locale = inject(LocaleService);
  readonly stateMatrix = [
    { from: 'ops.pkg.mx.f1', to: 'ops.pkg.mx.t1', reason: 'ops.pkg.mx.r1', owner: 'ops.pkg.mx.o1' },
    { from: 'ops.pkg.mx.f2', to: 'ops.pkg.mx.t2', reason: 'ops.pkg.mx.r2', owner: 'ops.pkg.mx.o2' },
    { from: 'ops.pkg.mx.f3', to: 'ops.pkg.mx.t3', reason: 'ops.pkg.mx.r3', owner: 'ops.pkg.mx.o3' },
    { from: 'ops.pkg.mx.f4', to: 'ops.pkg.mx.t4', reason: 'ops.pkg.mx.r4', owner: 'ops.pkg.mx.o4' },
    { from: 'ops.pkg.mx.f5', to: 'ops.pkg.mx.t5', reason: 'ops.pkg.mx.r5', owner: 'ops.pkg.mx.o5' },
    { from: 'ops.pkg.mx.f6', to: 'ops.pkg.mx.t6', reason: 'ops.pkg.mx.r6', owner: 'ops.pkg.mx.o6' },
    { from: 'ops.pkg.mx.f7', to: 'ops.pkg.mx.t7', reason: 'ops.pkg.mx.r7', owner: 'ops.pkg.mx.o7' },
    { from: 'ops.pkg.mx.f8', to: 'ops.pkg.mx.t8', reason: 'ops.pkg.mx.r8', owner: 'ops.pkg.mx.o8' },
  ];

  ngOnInit(): void {
    this.shell.set('ops.packages.title', 'ops.packages.sub');
    this.load();
  }

  openPackage(item: CatalogPackage): void {
    void this.router.navigate(['/ops/packages', item.id]);
  }

  campaignOf(item: CatalogPackage): OpsCampaign | undefined {
    return this.campaigns.find((row) => row.packageId === item.id);
  }

  campaignDate(item: CatalogPackage, field: 'startDate' | 'endDate'): string {
    const value = this.campaignOf(item)?.[field];
    return value ? this.toDate(value) : '—';
  }

  campaignDays(item: CatalogPackage): string {
    const days = this.campaignOf(item)?.benefitDays;
    return days ? this.locale.tf('ops.ui.nDays', { n: days }) : '—';
  }

  openAdd(): void {
    this.addingCampaign = false;
    this.draft = this.emptyDraft();
    this.adding = true;
  }

  create(): void {
    if (!this.canEditFeatures) {
      this.toast.show(this.locale.t('ops.pkg.noFeaturesPerm'));
      return;
    }
    const fields = this.packageFields();
    if (!fields) {
      return;
    }
    this.api.opsCreatePackage(fields).subscribe({
      next: (row) => {
        this.toast.show(this.locale.t('ops.pkg.toast.added'));
        this.draft = this.emptyDraft();
        this.adding = false;
        void this.router.navigate(['/ops/packages', row.id]);
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.pkg.toast.addFail'))),
    });
  }

  toDate(value: string): string {
    return value.slice(0, 10);
  }

  money(value: number | string | null | undefined): number {
    const next = Number(value ?? 0);
    return Number.isFinite(next) ? next : 0;
  }

  afterOf(priceBefore: number | string | null | undefined, discountPercent: number | string | null | undefined): number {
    const before = Math.max(0, this.money(priceBefore));
    const percent = Math.min(100, Math.max(0, this.money(discountPercent)));
    return Math.round((before * (1 - percent / 100) + Number.EPSILON) * 100) / 100;
  }

  hasDiscount(item: CatalogPackage): boolean {
    return this.money(item.discountPercent) > 0;
  }

  openCampaignAdd(): void {
    this.adding = false;
    this.draft = this.emptyDraft();
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    this.campaignDraft = {
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
      benefitDays: 30,
      clipToEndDate: true,
    };
    this.addingCampaign = true;
  }

  createPromo(): void {
    if (!this.canAddPromo) {
      this.toast.show(this.locale.t('ops.pkg.noPromoPerm'));
      return;
    }
    const fields = this.packageFields();
    if (!fields) {
      return;
    }
    const benefitDays = Number(this.campaignDraft.benefitDays);
    if (!benefitDays || benefitDays <= 0) {
      this.toast.show(this.locale.t('ops.pkg.needBenefit'));
      return;
    }
    if (!this.campaignDraft.startDate || !this.campaignDraft.endDate) {
      this.toast.show(this.locale.t('ops.pkg.needDates'));
      return;
    }
    if (this.campaignDraft.endDate < this.campaignDraft.startDate) {
      this.toast.show(this.locale.t('ops.pkg.endBeforeStart'));
      return;
    }
    this.api.opsCreatePackage({ ...fields, isPromotional: true }).subscribe({
      next: (row) => {
        this.api
          .opsCreateCampaign({
            nameAr: row.nameAr,
            packageId: row.id,
            startDate: this.campaignDraft.startDate,
            endDate: this.campaignDraft.endDate,
            benefitDays,
            clipToEndDate: Boolean(this.campaignDraft.clipToEndDate),
            isActive: true,
          })
          .subscribe({
            next: () => {
              this.toast.show(this.locale.t('ops.pkg.toast.promoAdded'));
              this.finishPromo(row.id);
            },
            error: (err) => {
              this.toast.show(apiMessage(err, this.locale.t('ops.pkg.toast.promoPartial')));
              this.finishPromo(row.id);
            },
          });
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.pkg.toast.addFail'))),
    });
  }

  previewServiceNames(item: CatalogPackage): string[] {
    return this.namedServices(item).slice(0, 3);
  }

  extraServiceCount(item: CatalogPackage): number {
    return Math.max(0, this.namedServices(item).length - 3);
  }

  private emptyDraft() {
    return { nameAr: '', durationMonths: 1, priceBefore: '' as number | '', discountPercent: '' as number | '', rank: 5 };
  }

  private packageFields(): {
    nameAr: string;
    durationMonths: number;
    priceBefore: number;
    discountPercent: number;
    rank: number;
  } | null {
    if (!this.draft.nameAr.trim()) {
      this.toast.show(this.locale.t('ops.pkg.needName'));
      return null;
    }
    const durationMonths = Number(this.draft.durationMonths);
    const priceBefore = Number(this.draft.priceBefore);
    const rank = Number(this.draft.rank);
    if (!durationMonths || durationMonths <= 0 || !priceBefore || priceBefore <= 0 || !rank || rank <= 0) {
      this.toast.show(this.locale.t('ops.pkg.needNumbers'));
      return null;
    }
    return {
      nameAr: this.draft.nameAr.trim(),
      durationMonths,
      priceBefore,
      discountPercent: Number(this.draft.discountPercent) || 0,
      rank,
    };
  }

  private finishPromo(packageId: string): void {
    this.draft = this.emptyDraft();
    this.addingCampaign = false;
    this.load();
    void this.router.navigate(['/ops/packages', packageId]);
  }

  private namedServices(item: CatalogPackage): string[] {
    const ids = new Set(item.serviceIds ?? []);
    const names = this.catalogServices.filter((service) => ids.has(service.id)).map((service) => this.locale.localizedName(service));
    if (names.length) {
      return names;
    }
    return ids.size ? [this.locale.tf('ops.pkg.nServices', { n: ids.size })] : [];
  }

  private load(): void {
    this.loading = true;
    this.api.services().subscribe({
      next: (services) => {
        this.catalogServices = services;
      },
    });
    this.api.opsPackages().subscribe({
      next: (packages) => {
        this.packages = packages;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.pkg.toast.loadFail')));
      },
    });
    this.api.opsCampaigns().subscribe({
      next: (campaigns) => {
        this.campaigns = campaigns.map((item) => ({ ...item, clipToEndDate: Boolean(item.clipToEndDate) }));
      },
    });
  }
}
