import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import { servicePhoto, type CatalogPackage, type CatalogService, type OpsCampaign } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { LocaleDateDirective } from '../shared/locale-date.directive';
import { PositiveIntDirective } from './positive-int.directive';

@Component({
  selector: 'app-ops-package-services',
  imports: [FormsModule, RouterLink, PositiveIntDirective, LocaleDateDirective],
  template: `
    @if (loading) {
      <p class="loading">{{ locale.t('ui.loading') }}</p>
    } @else if (!pkg) {
      <p class="muted">{{ locale.t('ops.pkg.missing') }}</p>
    } @else {
      <div class="section-head">
        <div>
          <a class="text-link back" routerLink="/ops/packages">{{ locale.t('ops.pkg.back') }}</a>
          <h2>{{ locale.localizedName(pkg) }}</h2>
          <p>{{ locale.tf('p.pkg.months', { n: pkg.durationMonths ?? 0 }) }}</p>
        </div>
        <div class="ops-drawer-actions" style="margin:0">
          @if (canSavePackage) {
            <button class="btn primary" type="button" [disabled]="saving" (click)="save()">{{ locale.t('ops.pkg.save') }}</button>
          }
          @if (canEditFeatures) {
            <button class="btn ghost" type="button" [disabled]="saving" (click)="toggle()">
              {{ pkg.isActive ? locale.t('ops.pkg.hide') : locale.t('ops.pkg.show') }}
            </button>
          }
        </div>
      </div>

      <div class="form-grid" style="margin-bottom:22px">
        <div class="field">
          <label>{{ locale.t('ops.ui.name') }}</label>
          <input class="input" [(ngModel)]="pkg.nameAr" [readOnly]="!canEditFeatures" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.durationMonths') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.durationMonths" [readOnly]="!canEditFeatures" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.priceBefore') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.priceBefore" [readOnly]="!canEditPrices" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.discountPct') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.discountPercent" [readOnly]="!canEditPrices" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.priceAfter') }}</label>
          <input class="input" [value]="afterOf(pkg.priceBefore, pkg.discountPercent)" readonly />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.rank') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.rank" [readOnly]="!canEditFeatures" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.maxServices') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.maxServices" [readOnly]="!canEditFeatures" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.maxPhotos') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.maxPhotos" [readOnly]="!canEditFeatures" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.maxVideos') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.maxVideos" [readOnly]="!canEditFeatures" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.pkg.maxAlbums') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.maxAlbums" [readOnly]="!canEditFeatures" />
        </div>
      </div>

      @if (pkg.isPromotional) {
        <div class="form-grid" style="margin-bottom:22px">
          <div class="field">
            <label>{{ locale.t('ops.pkg.start') }}</label>
            <input class="input" type="date" [(ngModel)]="campaignDraft.startDate" [readOnly]="!canCampaign" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.pkg.end') }}</label>
            <input class="input" type="date" [(ngModel)]="campaignDraft.endDate" [readOnly]="!canCampaign" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.pkg.benefitDays') }}</label>
            <input class="input" inputmode="numeric" positiveInt [(ngModel)]="campaignDraft.benefitDays" [readOnly]="!canCampaign" />
          </div>
          <label class="ops-check" [class.on]="campaignDraft.clipToEndDate">
            <input type="checkbox" name="editClipToEndDate" [(ngModel)]="campaignDraft.clipToEndDate" [disabled]="!canCampaign" />
            <span class="ops-check-copy">
              <b>{{ locale.t('ops.pkg.clipTitle') }}</b>
              <small>{{ locale.t('ops.pkg.clipHint') }}</small>
            </span>
          </label>
        </div>
      }

      <div class="section-head">
        <div>
          <h2>{{ locale.t('ops.pkg.servicesTitle') }}</h2>
          <p>{{ canEditFeatures ? locale.t('ops.pkg.servicesEdit') : locale.t('ops.pkg.servicesView') }}</p>
        </div>
      </div>
      <div class="pkg-services-page">
        <div class="pkg-services-box">
          <div class="pkg-services-toolbar">
            <span>{{ locale.tf('ops.pkg.pickedOf', { a: pickedCount(), b: services.length }) }}</span>
            @if (canEditFeatures) {
              <div class="pkg-services-links">
                <button class="text-link" type="button" (click)="setAll(true)">{{ locale.t('ops.pkg.selectAll') }}</button>
                <button class="text-link" type="button" (click)="setAll(false)">{{ locale.t('ops.pkg.clearAll') }}</button>
              </div>
            }
          </div>
          <div class="pkg-services-grid">
            @for (service of services; track service.id) {
              <label class="pkg-service" [class.on]="pick[service.id]">
                <input type="checkbox" [name]="'svc-' + service.id" [(ngModel)]="pick[service.id]" [disabled]="!canEditFeatures" />
                <img [src]="photoOf(service)" alt="" />
                <span>{{ locale.localizedName(service) }}</span>
                <i>✓</i>
              </label>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class OpsPackageServicesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
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

  get canSavePackage(): boolean {
    return this.canEditFeatures || this.canEditPrices || this.canCampaign;
  }

  pkg: CatalogPackage | null = null;
  campaign: OpsCampaign | null = null;
  campaignDraft = this.emptyCampaign();
  services: CatalogService[] = [];
  pick: Record<string, boolean> = {};
  loading = true;
  saving = false;

  ngOnInit(): void {
    this.shell.set('ops.pkg.title', 'ops.pkg.sub');
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    forkJoin({
      packages: this.api.opsPackages(),
      services: this.api.services(),
      campaigns: this.api.opsCampaigns(),
    }).subscribe({
      next: ({ packages, services, campaigns }) => {
        this.services = services;
        this.pkg = packages.find((item) => item.id === id) ?? null;
        if (!this.pkg) {
          this.loading = false;
          this.toast.show(this.locale.t('ops.pkg.missing'));
          void this.router.navigate(['/ops/packages']);
          return;
        }
        this.campaign = campaigns.find((item) => item.packageId === id) ?? null;
        this.campaignDraft = this.campaign
          ? {
              startDate: this.campaign.startDate.slice(0, 10),
              endDate: this.campaign.endDate.slice(0, 10),
              benefitDays: this.campaign.benefitDays,
              clipToEndDate: Boolean(this.campaign.clipToEndDate),
            }
          : this.emptyCampaign();
        this.shell.set(this.locale.localizedName(this.pkg), this.locale.tf('p.pkg.months', { n: this.pkg.durationMonths ?? 0 }));
        const selected = new Set(this.pkg.serviceIds ?? []);
        this.pick = {};
        for (const service of services) {
          this.pick[service.id] = selected.has(service.id);
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.pkg.toast.loadOneFail')));
      },
    });
  }

  photoOf(service: CatalogService): string {
    return servicePhoto(service);
  }

  pickedCount(): number {
    return this.services.filter((service) => this.pick[service.id]).length;
  }

  setAll(on: boolean): void {
    if (!this.canEditFeatures) {
      return;
    }
    for (const service of this.services) {
      this.pick[service.id] = on;
    }
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

  save(): void {
    if (!this.pkg) {
      return;
    }
    if (!this.canSavePackage) {
      this.toast.show(this.locale.t('ops.pkg.noEditPerm'));
      return;
    }
    const durationMonths = Number(this.pkg.durationMonths);
    const priceBefore = Number(this.pkg.priceBefore ?? this.pkg.price);
    const rank = Number(this.pkg.rank);
    if (!durationMonths || durationMonths <= 0 || !priceBefore || priceBefore <= 0 || !rank || rank <= 0) {
      this.toast.show(this.locale.t('ops.pkg.needNumbers'));
      return;
    }
    this.saving = true;
    const body: Partial<CatalogPackage> = {};
    if (this.canEditFeatures) {
      body.nameAr = this.pkg.nameAr;
      body.durationMonths = durationMonths;
      body.rank = rank;
      body.maxServices = this.numOrNull(this.pkg.maxServices);
      body.maxPhotos = this.numOrNull(this.pkg.maxPhotos);
      body.maxVideos = this.numOrNull(this.pkg.maxVideos);
      body.maxAlbums = this.numOrNull(this.pkg.maxAlbums);
      body.serviceIds = this.services.filter((service) => this.pick[service.id]).map((service) => service.id);
    }
    if (this.canEditPrices) {
      body.priceBefore = priceBefore;
      body.discountPercent = Number(this.pkg.discountPercent) || 0;
    }
    if (!Object.keys(body).length) {
      if (this.pkg.isPromotional && this.canCampaign) {
        this.saveCampaign(this.pkg);
        return;
      }
      this.saving = false;
      this.toast.show(this.locale.t('ops.pkg.noEditPerm'));
      return;
    }
    this.api.opsPatchPackage(this.pkg.id, body).subscribe({
      next: (row) => {
        this.pkg = row;
        this.shell.set(this.locale.localizedName(row), this.locale.tf('p.pkg.months', { n: row.durationMonths ?? 0 }));
        if (row.isPromotional && this.canCampaign) {
          this.saveCampaign(row);
          return;
        }
        this.saving = false;
        this.toast.show(this.locale.t('ops.pkg.toast.saved'));
      },
      error: (err) => {
        this.saving = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.pkg.toast.saveFail')));
      },
    });
  }

  toggle(): void {
    if (!this.pkg) {
      return;
    }
    if (!this.canEditFeatures) {
      this.toast.show(this.locale.t('ops.pkg.noTogglePerm'));
      return;
    }
    this.api.opsPatchPackage(this.pkg.id, { isActive: !this.pkg.isActive }).subscribe({
      next: (row) => {
        if (this.pkg) {
          this.pkg.isActive = row.isActive;
        }
        this.toast.show(row.isActive ? this.locale.t('ops.pkg.toast.visible') : this.locale.t('ops.pkg.toast.stopped'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ui.statusFail'))),
    });
  }

  private saveCampaign(pkg: CatalogPackage): void {
    if (!this.canCampaign) {
      this.saving = false;
      this.toast.show(this.locale.t('ops.pkg.toast.saved'));
      return;
    }
    const benefitDays = Number(this.campaignDraft.benefitDays);
    if (!benefitDays || benefitDays <= 0) {
      this.saving = false;
      this.toast.show(this.locale.t('ops.pkg.needBenefit'));
      return;
    }
    if (!this.campaignDraft.startDate || !this.campaignDraft.endDate) {
      this.saving = false;
      this.toast.show(this.locale.t('ops.pkg.needDates'));
      return;
    }
    if (this.campaignDraft.endDate < this.campaignDraft.startDate) {
      this.saving = false;
      this.toast.show(this.locale.t('ops.pkg.endBeforeStart'));
      return;
    }
    const body = {
      nameAr: pkg.nameAr,
      startDate: this.campaignDraft.startDate,
      endDate: this.campaignDraft.endDate,
      benefitDays,
      clipToEndDate: Boolean(this.campaignDraft.clipToEndDate),
      isActive: true,
    };
    const request = this.campaign
      ? this.api.opsPatchCampaign(this.campaign.id, body)
      : this.api.opsCreateCampaign({ ...body, packageId: pkg.id });
    request.subscribe({
      next: (row) => {
        this.campaign = row;
        this.saving = false;
        this.toast.show(this.locale.t('ops.pkg.toast.saved'));
      },
      error: (err) => {
        this.saving = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.pkg.toast.campaignFail')));
      },
    });
  }

  private emptyCampaign() {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return {
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
      benefitDays: 30,
      clipToEndDate: true,
    };
  }

  private numOrNull(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  }
}
