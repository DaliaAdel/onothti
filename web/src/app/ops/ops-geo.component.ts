import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsCity, OpsRegion } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsModalComponent } from './ops-modal.component';
import { PositiveIntDirective } from './positive-int.directive';
import { keepSelected } from './ops-ui';

const emptyRegionDraft = () => ({ nameAr: '', nameEn: '', sortOrder: '' as number | '' });
const emptyCityDraft = () => ({ nameAr: '', nameEn: '' });

@Component({
  selector: 'app-ops-geo',
  imports: [FormsModule, OpsModalComponent, PositiveIntDirective],
  template: `
    @if (!selected) {
      <div class="section-head">
        <div>
          <h2>{{ locale.t('ops.geo.heading') }}</h2>
          <p>{{ locale.t('ops.geo.intro') }}</p>
        </div>
        @if (canManage) {
          <button class="btn primary" type="button" (click)="adding = true">{{ locale.t('ops.geo.add') }}</button>
        }
      </div>

      <app-ops-modal [open]="adding" [title]="locale.t('ops.geo.addTitle')" [kicker]="locale.t('ops.geo.addKicker')" (closed)="adding = false">
        <div class="form-grid">
          <div class="field">
            <label>{{ locale.t('ops.ui.nameReq') }}</label>
            <input class="input" [(ngModel)]="regionDraft.nameAr" [placeholder]="locale.t('ops.geo.regionPh')" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
            <input class="input" [(ngModel)]="regionDraft.nameEn" [placeholder]="locale.t('ops.geo.regionEnPh')" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.sort') }}</label>
            <input class="input" inputmode="numeric" positiveInt [(ngModel)]="regionDraft.sortOrder" />
          </div>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createRegion()">{{ locale.t('ops.geo.addSubmit') }}</button>
      </app-ops-modal>

      @if (loading) {
        <p class="loading">{{ locale.t('ui.loading') }}</p>
      } @else if (!regions.length) {
        <p class="page-empty">{{ locale.t('ops.geo.empty') }}</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>{{ locale.t('ops.ui.name') }}</th>
                <th>{{ locale.t('ops.ui.nameEn') }}</th>
                <th>{{ locale.t('ops.geo.col.cities') }}</th>
                <th>{{ locale.t('ops.ui.sort') }}</th>
                <th>{{ locale.t('ops.ui.appearance') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (region of regions; track region.id) {
                <tr (click)="openRegion(region)">
                  <td><b>{{ locale.localizedName(region) }}</b></td>
                  <td>{{ region.nameEn }}</td>
                  <td>{{ region.cities.length }}</td>
                  <td>{{ region.sortOrder }}</td>
                  <td>
                    <span class="status {{ region.isVisible ? 'success' : 'error' }}">
                      {{ region.isVisible ? locale.t('ops.ui.visible') : locale.t('ops.ui.hidden') }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else if (!selectedCity) {
      <div class="section-head">
        <div>
          <button class="text-link back" type="button" (click)="closeRegion()">{{ locale.t('ops.geo.back') }}</button>
          <h2>{{ locale.localizedName(selected) }}</h2>
          <p>{{ selected.nameEn }} · {{ locale.tf('ops.ui.nCities', { n: selected.cities.length }) }}</p>
        </div>
        @if (canManage) {
          <button class="btn primary" type="button" (click)="openAddCity()">{{ locale.t('ops.geo.addCity') }}</button>
        }
      </div>

      <div class="form-grid" style="margin-bottom:18px">
        <div class="field">
          <label>{{ locale.t('ops.ui.nameReq') }}</label>
          <input class="input" [(ngModel)]="selected.nameAr" [readOnly]="!canManage" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
          <input class="input" [(ngModel)]="selected.nameEn" [readOnly]="!canManage" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.sort') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="selected.sortOrder" [readOnly]="!canManage" />
        </div>
      </div>
      @if (canManage) {
        <div class="ops-drawer-actions" style="margin:0 0 22px">
          <button class="btn primary" type="button" (click)="saveRegion(selected)">{{ locale.t('ops.geo.saveRegion') }}</button>
          <button class="btn ghost" type="button" (click)="toggleRegion(selected)">
            {{ selected.isVisible ? locale.t('ops.ui.hide') : locale.t('ops.ui.show') }}
          </button>
        </div>
      }

      <div class="section-head">
        <div>
          <h2>{{ locale.t('ops.geo.citiesTitle') }}</h2>
          <p>{{ locale.t('ops.geo.citiesHint') }}</p>
        </div>
      </div>
      @if (!selected.cities.length) {
        <p class="page-empty">{{ locale.t('ops.geo.citiesEmpty') }}</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>{{ locale.t('ops.ui.name') }}</th>
                <th>{{ locale.t('ops.ui.nameEn') }}</th>
                <th>{{ locale.t('ops.ui.appearance') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (city of selected.cities; track city.id) {
                <tr (click)="openCity(city)">
                  <td><b>{{ locale.localizedName(city) }}</b></td>
                  <td>{{ city.nameEn }}</td>
                  <td>
                    <span class="status {{ city.isVisible ? 'success' : 'error' }}">
                      {{ city.isVisible ? locale.t('ops.ui.visible') : locale.t('ops.ui.hidden') }}
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
          <button class="text-link back" type="button" (click)="closeCity()">{{ locale.tf('ops.geo.backTo', { name: locale.localizedName(selected) }) }}</button>
          <h2>{{ locale.localizedName(selectedCity) }}</h2>
          <p>{{ selectedCity.nameEn }}</p>
        </div>
      </div>

      <div class="form-grid" style="margin-bottom:18px">
        <div class="field">
          <label>{{ locale.t('ops.ui.nameReq') }}</label>
          <input class="input" [(ngModel)]="selectedCity.nameAr" [readOnly]="!canManage" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
          <input class="input" [(ngModel)]="selectedCity.nameEn" [readOnly]="!canManage" />
        </div>
      </div>
      @if (canManage) {
        <div class="ops-drawer-actions" style="margin:0 0 22px">
          <button class="btn primary" type="button" (click)="saveCity(selectedCity)">{{ locale.t('ops.geo.saveCity') }}</button>
          <button class="btn ghost" type="button" (click)="toggleCity(selectedCity)">
            {{ selectedCity.isVisible ? locale.t('ops.ui.hide') : locale.t('ops.ui.show') }}
          </button>
        </div>
      }
    }

    <app-ops-modal [open]="addingCity" [title]="locale.t('ops.geo.addCityTitle')" [kicker]="selected ? locale.localizedName(selected) : ''" (closed)="addingCity = false">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.nameReq') }}</label>
          <input class="input" [(ngModel)]="cityDraft.nameAr" [placeholder]="locale.t('ops.geo.cityPh')" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
          <input class="input" [(ngModel)]="cityDraft.nameEn" [placeholder]="locale.t('ops.geo.cityEnPh')" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createCity()">{{ locale.t('ops.geo.addCitySubmit') }}</button>
    </app-ops-modal>
  `,
})
export class OpsGeoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);

  get canManage(): boolean {
    return this.session.hasPermission('CAT-02');
  }

  loading = true;
  adding = false;
  addingCity = false;
  regions: OpsRegion[] = [];
  selected: OpsRegion | null = null;
  selectedCity: OpsCity | null = null;
  regionDraft = emptyRegionDraft();
  cityDraft = emptyCityDraft();

  ngOnInit(): void {
    this.shell.set('ops.geo.title', 'ops.geo.sub');
    this.load();
  }

  openRegion(region: OpsRegion): void {
    this.selected = region;
    this.selectedCity = null;
    this.shell.set(this.locale.localizedName(region), this.locale.t('ops.geo.cities'));
  }

  closeRegion(): void {
    this.selected = null;
    this.selectedCity = null;
    this.shell.set('ops.geo.title', 'ops.geo.sub');
  }

  openCity(city: OpsCity): void {
    this.selectedCity = city;
    this.shell.set(this.locale.localizedName(city), this.locale.t('ops.city.edit'));
  }

  closeCity(): void {
    this.selectedCity = null;
    if (this.selected) {
      this.shell.set(this.locale.localizedName(this.selected), this.locale.t('ops.geo.cities'));
    }
  }

  createRegion(): void {
    if (this.denyManage()) {
      return;
    }
    if (!this.hasNames(this.regionDraft.nameAr, this.regionDraft.nameEn)) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsCreateRegion({
        nameAr: this.regionDraft.nameAr.trim(),
        nameEn: this.regionDraft.nameEn.trim(),
        sortOrder: Number(this.regionDraft.sortOrder) || 0,
        isVisible: true,
      })
      .subscribe({
        next: () => {
          this.toast.show(this.locale.t('ops.geo.toast.regionAdded'));
          this.regionDraft = emptyRegionDraft();
          this.adding = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.geo.toast.regionAddFail'))),
      });
  }

  saveRegion(region: OpsRegion): void {
    if (this.denyManage()) {
      return;
    }
    if (!this.hasNames(region.nameAr, region.nameEn)) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsPatchRegion(region.id, {
        nameAr: region.nameAr.trim(),
        nameEn: region.nameEn.trim(),
        sortOrder: Number(region.sortOrder) || 0,
      })
      .subscribe({
        next: (row) => {
          region.nameAr = row.nameAr;
          region.nameEn = row.nameEn;
          region.sortOrder = row.sortOrder;
          this.shell.set(this.locale.localizedName(region), this.locale.t('ops.geo.cities'));
          this.toast.show(this.locale.t('ops.geo.toast.regionSaved'));
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.geo.toast.regionSaveFail'))),
      });
  }

  toggleRegion(region: OpsRegion): void {
    if (this.denyManage()) {
      return;
    }
    this.api.opsPatchRegion(region.id, { isVisible: !region.isVisible }).subscribe({
      next: (row) => {
        region.isVisible = row.isVisible;
        this.toast.show(row.isVisible ? this.locale.t('ops.geo.toast.regionVisible') : this.locale.t('ops.geo.toast.regionHidden'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.geo.toast.regionVisFail'))),
    });
  }

  openAddCity(): void {
    if (this.denyManage()) {
      return;
    }
    this.cityDraft = emptyCityDraft();
    this.addingCity = true;
  }

  createCity(): void {
    if (this.denyManage() || !this.selected) {
      return;
    }
    if (!this.hasNames(this.cityDraft.nameAr, this.cityDraft.nameEn)) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsCreateCity({
        regionId: this.selected.id,
        nameAr: this.cityDraft.nameAr.trim(),
        nameEn: this.cityDraft.nameEn.trim(),
        isVisible: true,
      })
      .subscribe({
        next: () => {
          this.toast.show(this.locale.t('ops.geo.toast.cityAdded'));
          this.cityDraft = emptyCityDraft();
          this.addingCity = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.geo.toast.cityAddFail'))),
      });
  }

  saveCity(city: OpsCity): void {
    if (this.denyManage()) {
      return;
    }
    if (!this.hasNames(city.nameAr, city.nameEn)) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsPatchCity(city.id, {
        nameAr: city.nameAr.trim(),
        nameEn: city.nameEn.trim(),
      })
      .subscribe({
        next: (row) => {
          city.nameAr = row.nameAr;
          city.nameEn = row.nameEn;
          this.shell.set(this.locale.localizedName(city), this.locale.t('ops.city.edit'));
          this.toast.show(this.locale.t('ops.geo.toast.citySaved'));
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.geo.toast.citySaveFail'))),
      });
  }

  toggleCity(city: OpsCity): void {
    if (this.denyManage()) {
      return;
    }
    this.api.opsPatchCity(city.id, { isVisible: !city.isVisible }).subscribe({
      next: (row) => {
        city.isVisible = row.isVisible;
        this.toast.show(row.isVisible ? this.locale.t('ops.geo.toast.cityVisible') : this.locale.t('ops.geo.toast.cityHidden'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.geo.toast.cityVisFail'))),
    });
  }

  private denyManage(): boolean {
    if (this.canManage) {
      return false;
    }
    this.toast.show(this.locale.t('ops.ui.noPerm'));
    return true;
  }

  private hasNames(nameAr: string, nameEn: string): boolean {
    return nameAr.trim().length >= 2 && nameEn.trim().length >= 2;
  }

  private load(): void {
    this.loading = true;
    this.api.opsRegions().subscribe({
      next: (regions) => {
        this.regions = regions;
        this.selected = keepSelected(this.regions, this.selected);
        this.selectedCity = this.selected ? keepSelected(this.selected.cities, this.selectedCity) : null;
        if (this.selectedCity) {
          this.shell.set(this.locale.localizedName(this.selectedCity), this.locale.t('ops.city.edit'));
        } else if (this.selected) {
          this.shell.set(this.locale.localizedName(this.selected), this.locale.t('ops.geo.cities'));
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.geo.toast.loadFail')));
      },
    });
  }
}
