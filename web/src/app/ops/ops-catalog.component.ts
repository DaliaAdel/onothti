import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsCatalogService, OpsSubService } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { OpsModalComponent } from './ops-modal.component';
import { PositiveIntDirective } from './positive-int.directive';
import { keepSelected } from './ops-ui';

const emptyServiceDraft = () => ({ nameAr: '', nameEn: '', sortOrder: '' as number | '' });
const emptySubDraft = () => ({ nameAr: '', nameEn: '', sortOrder: '' as number | '' });

@Component({
  selector: 'app-ops-catalog',
  imports: [FormsModule, OpsDrawerComponent, OpsModalComponent, PositiveIntDirective],
  template: `
    @if (!selected) {
      <div class="section-head">
        <div>
          <h2>{{ locale.t('ops.cat.heading') }}</h2>
          <p>{{ locale.t('ops.cat.intro') }}</p>
        </div>
        @if (canManage) {
          <button class="btn primary" type="button" (click)="openAdd()">{{ locale.t('ops.cat.add') }}</button>
        }
      </div>

      <app-ops-modal [open]="adding" [title]="locale.t('ops.cat.addTitle')" [kicker]="locale.t('ops.cat.addKicker')" (closed)="closeAdd()">
        <div class="form-grid">
          <div class="field">
            <label>{{ locale.t('ops.ui.nameReq') }}</label>
            <input class="input" [(ngModel)]="serviceDraft.nameAr" [placeholder]="locale.t('ops.cat.namePh')" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
            <input class="input" [(ngModel)]="serviceDraft.nameEn" [placeholder]="locale.t('ops.cat.nameEnPh')" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.sort') }}</label>
            <input class="input" inputmode="numeric" positiveInt [(ngModel)]="serviceDraft.sortOrder" />
          </div>
          <div class="field full">
            <label>{{ locale.t('ops.cat.image') }}</label>
            <div class="ops-service-image">
              @if (draftPreview) {
                <img class="ops-service-preview" [src]="draftPreview" alt="" />
              }
              <input type="file" accept="image/jpeg,image/png,image/webp" (change)="onDraftImage($event)" />
            </div>
          </div>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createService()">{{ locale.t('ops.cat.addSubmit') }}</button>
      </app-ops-modal>

      @if (loading) {
        <p class="loading">{{ locale.t('ui.loading') }}</p>
      } @else if (!services.length) {
        <p class="page-empty">{{ locale.t('ops.cat.empty') }}</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>{{ locale.t('ops.cat.col.image') }}</th>
                <th>{{ locale.t('ops.ui.name') }}</th>
                <th>{{ locale.t('ops.ui.nameEn') }}</th>
                <th>{{ locale.t('ops.cat.col.subs') }}</th>
                <th>{{ locale.t('ops.ui.sort') }}</th>
                <th>{{ locale.t('ops.ui.appearance') }}</th>
                @if (canManage) {
                  <th></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (service of services; track service.id) {
                <tr (click)="openService(service)">
                  <td>
                    @if (service.imageUrl) {
                      <img class="ops-thumb" [src]="service.imageUrl" alt="" />
                    } @else {
                      <span class="muted small">{{ locale.t('ops.ui.noImage') }}</span>
                    }
                  </td>
                  <td><b>{{ locale.localizedName(service) }}</b></td>
                  <td>{{ service.nameEn }}</td>
                  <td>{{ service.subServices.length }}</td>
                  <td>{{ service.sortOrder }}</td>
                  <td>
                    <span class="status {{ service.isVisible ? 'success' : 'error' }}">
                      {{ service.isVisible ? locale.t('ops.ui.visible') : locale.t('ops.ui.hidden') }}
                    </span>
                  </td>
                  @if (canManage) {
                    <td>
                      <button class="btn ghost" type="button" (click)="removeService(service, $event)">{{ locale.t('ui.delete') }}</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      <div class="section-head">
        <div>
          <button class="text-link back" type="button" (click)="closeService()">{{ locale.t('ops.cat.back') }}</button>
          <h2>{{ locale.localizedName(selected) }}</h2>
          <p>{{ selected.nameEn }} · {{ locale.tf('ops.ui.nSubs', { n: selected.subServices.length }) }}</p>
        </div>
        @if (canManage) {
          <button class="btn primary" type="button" (click)="openAddSub()">{{ locale.t('ops.cat.addSub') }}</button>
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
        <div class="field full">
          <label>{{ locale.t('ops.cat.image') }}</label>
          <div class="ops-service-image">
            @if (selected.imageUrl) {
              <img class="ops-service-preview" [src]="selected.imageUrl" alt="" />
            }
            @if (canManage) {
              <input type="file" accept="image/jpeg,image/png,image/webp" (change)="onSelectedImage($event)" />
              @if (selected.imageUrl) {
                <button class="btn ghost" type="button" (click)="clearSelectedImage()">{{ locale.t('ops.cat.removeImage') }}</button>
              }
            }
          </div>
        </div>
      </div>
      @if (canManage) {
        <div class="ops-drawer-actions" style="margin:0 0 22px">
          <button class="btn primary" type="button" (click)="saveService(selected)">{{ locale.t('ops.cat.save') }}</button>
          <button class="btn ghost" type="button" (click)="toggleService(selected)">
            {{ selected.isVisible ? locale.t('ops.ui.hide') : locale.t('ops.ui.show') }}
          </button>
          <button class="btn ghost" type="button" (click)="removeService(selected)">{{ locale.t('ui.delete') }}</button>
        </div>
      }

      <div class="section-head">
        <div>
          <h2>{{ locale.t('ops.catalog.subs') }}</h2>
          <p>{{ locale.t('ops.cat.subsHint') }}</p>
        </div>
      </div>
      @if (!selected.subServices.length) {
        <p class="page-empty">{{ locale.t('ops.cat.subsEmpty') }}</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>{{ locale.t('ops.ui.name') }}</th>
                <th>{{ locale.t('ops.ui.nameEn') }}</th>
                <th>{{ locale.t('ops.ui.sort') }}</th>
                <th>{{ locale.t('ops.ui.appearance') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (sub of selected.subServices; track sub.id) {
                <tr [class.active]="selectedSub?.id === sub.id" (click)="selectedSub = sub">
                  <td><b>{{ locale.localizedName(sub) }}</b></td>
                  <td>{{ sub.nameEn }}</td>
                  <td>{{ sub.sortOrder }}</td>
                  <td>
                    <span class="status {{ sub.isVisible ? 'success' : 'error' }}">
                      {{ sub.isVisible ? locale.t('ops.ui.visible') : locale.t('ops.ui.hidden') }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <app-ops-modal [open]="addingSub" [title]="locale.t('ops.cat.addSubTitle')" [kicker]="selected ? locale.localizedName(selected) : ''" (closed)="addingSub = false">
      <div class="form-grid">
        <div class="field">
          <label>{{ locale.t('ops.ui.nameReq') }}</label>
          <input class="input" [(ngModel)]="subDraft.nameAr" [placeholder]="locale.t('ops.cat.subPh')" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
          <input class="input" [(ngModel)]="subDraft.nameEn" [placeholder]="locale.t('ops.cat.subEnPh')" />
        </div>
        <div class="field">
          <label>{{ locale.t('ops.ui.sort') }}</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="subDraft.sortOrder" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createSub()">{{ locale.t('ops.cat.addSubSubmit') }}</button>
    </app-ops-modal>

    <app-ops-drawer
      [open]="!!selectedSub"
      [title]="selectedSub ? locale.localizedName(selectedSub) : ''"
      [kicker]="locale.t('ops.cat.subKicker')"
      (closed)="selectedSub = null"
    >
      @if (selectedSub; as sub) {
        <div class="form-grid">
          <div class="field">
            <label>{{ locale.t('ops.ui.nameReq') }}</label>
            <input class="input" [(ngModel)]="sub.nameAr" [readOnly]="!canManage" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.nameEnReq') }}</label>
            <input class="input" [(ngModel)]="sub.nameEn" [readOnly]="!canManage" />
          </div>
          <div class="field">
            <label>{{ locale.t('ops.ui.sort') }}</label>
            <input class="input" inputmode="numeric" positiveInt [(ngModel)]="sub.sortOrder" [readOnly]="!canManage" />
          </div>
        </div>
        @if (canManage) {
          <div class="ops-drawer-actions">
            <button class="btn primary" type="button" (click)="saveSub(sub)">{{ locale.t('ui.save') }}</button>
            <button class="btn ghost" type="button" (click)="toggleSub(sub)">
              {{ sub.isVisible ? locale.t('ops.ui.hide') : locale.t('ops.ui.show') }}
            </button>
            <button class="btn ghost" type="button" (click)="removeSub(sub)">{{ locale.t('ui.delete') }}</button>
          </div>
        }
      }
    </app-ops-drawer>
  `,
})
export class OpsCatalogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  get canManage(): boolean {
    return this.session.hasPermission('CAT-01');
  }

  loading = true;
  adding = false;
  addingSub = false;
  services: OpsCatalogService[] = [];
  selected: OpsCatalogService | null = null;
  selectedSub: OpsSubService | null = null;
  serviceDraft = emptyServiceDraft();
  subDraft = emptySubDraft();
  draftFile: File | null = null;
  draftPreview: string | null = null;

  ngOnInit(): void {
    this.shell.set('ops.catalog.title', 'ops.catalog.sub');
    this.load();
  }

  openService(service: OpsCatalogService): void {
    this.selected = service;
    this.selectedSub = null;
    this.shell.set(this.locale.localizedName(service), this.locale.t('ops.catalog.subs'));
  }

  closeService(): void {
    this.selected = null;
    this.selectedSub = null;
    this.shell.set('ops.catalog.title', 'ops.catalog.sub');
  }

  openAdd(): void {
    if (this.denyManage()) {
      return;
    }
    this.serviceDraft = emptyServiceDraft();
    this.resetDraftImage();
    this.adding = true;
  }

  closeAdd(): void {
    this.adding = false;
    this.resetDraftImage();
  }

  createService(): void {
    if (this.denyManage()) {
      return;
    }
    if (!this.hasNames(this.serviceDraft.nameAr, this.serviceDraft.nameEn)) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    const file = this.draftFile;
    this.api
      .opsCreateService({
        nameAr: this.serviceDraft.nameAr.trim(),
        nameEn: this.serviceDraft.nameEn.trim(),
        sortOrder: Number(this.serviceDraft.sortOrder) || 0,
        isVisible: true,
      })
      .subscribe({
        next: (row) => {
          if (!file) {
            this.finishCreate(this.locale.t('ops.cat.toast.added'));
            return;
          }
          this.api.opsUploadServiceImage(row.id, file).subscribe({
            next: () => this.finishCreate(this.locale.t('ops.cat.toast.addedImage')),
            error: (err) => {
              this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.addedImageFail')));
              this.finishCreate();
            },
          });
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.addFail'))),
      });
  }

  onDraftImage(event: Event): void {
    const file = this.fileFrom(event);
    if (!file) {
      return;
    }
    this.resetDraftImage();
    this.draftFile = file;
    this.draftPreview = URL.createObjectURL(file);
  }

  onSelectedImage(event: Event): void {
    const file = this.fileFrom(event);
    if (!file || !this.selected) {
      return;
    }
    this.api.opsUploadServiceImage(this.selected.id, file).subscribe({
      next: (row) => {
        this.applyService(row);
        this.toast.show(this.locale.t('ops.cat.toast.uploaded'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.uploadFail'))),
    });
  }

  clearSelectedImage(): void {
    if (this.denyManage() || !this.selected) {
      return;
    }
    this.api.opsClearServiceImage(this.selected.id).subscribe({
      next: (row) => {
        this.applyService(row);
        this.toast.show(this.locale.t('ops.cat.toast.imageRemoved'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.imageRemoveFail'))),
    });
  }

  saveService(service: OpsCatalogService): void {
    if (this.denyManage()) {
      return;
    }
    if (!this.hasNames(service.nameAr, service.nameEn)) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsPatchService(service.id, {
        nameAr: service.nameAr.trim(),
        nameEn: service.nameEn.trim(),
        sortOrder: Number(service.sortOrder) || 0,
      })
      .subscribe({
        next: (row) => {
          Object.assign(service, row);
          this.shell.set(this.locale.localizedName(service), this.locale.t('ops.catalog.subs'));
          this.toast.show(this.locale.t('ops.cat.toast.saved'));
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.saveFail'))),
      });
  }

  toggleService(service: OpsCatalogService): void {
    if (this.denyManage()) {
      return;
    }
    this.api.opsPatchService(service.id, { isVisible: !service.isVisible }).subscribe({
      next: (row) => {
        service.isVisible = row.isVisible;
        this.toast.show(row.isVisible ? this.locale.t('ops.cat.toast.visible') : this.locale.t('ops.cat.toast.hidden'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ui.visibilityFail'))),
    });
  }

  async removeService(service: OpsCatalogService, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.denyManage()) {
      return;
    }
    const subCount = service.subServices.length;
    const message = subCount
      ? this.locale.tf('ops.ui.deleteNamedSubs', { name: this.locale.localizedName(service), n: subCount })
      : this.locale.tf('ops.ui.deleteNamed', { name: this.locale.localizedName(service) });
    const ok = await this.confirm.ask({
      title: this.locale.t('ops.ui.confirmDelete'),
      message,
      confirmLabel: this.locale.t('ui.delete'),
      cancelLabel: this.locale.t('ui.cancel'),
    });
    if (!ok) {
      return;
    }
    this.api.opsDeleteService(service.id).subscribe({
      next: () => {
        this.toast.show(this.locale.t('ops.cat.toast.deleted'));
        if (this.selected?.id === service.id) {
          this.closeService();
        }
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.deleteFail'))),
    });
  }

  openAddSub(): void {
    if (this.denyManage()) {
      return;
    }
    this.subDraft = emptySubDraft();
    this.addingSub = true;
  }

  createSub(): void {
    if (this.denyManage() || !this.selected) {
      return;
    }
    if (!this.hasNames(this.subDraft.nameAr, this.subDraft.nameEn)) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsCreateSubService(this.selected.id, {
        nameAr: this.subDraft.nameAr.trim(),
        nameEn: this.subDraft.nameEn.trim(),
        sortOrder: Number(this.subDraft.sortOrder) || 0,
      })
      .subscribe({
        next: () => {
          this.toast.show(this.locale.t('ops.cat.toast.subAdded'));
          this.subDraft = emptySubDraft();
          this.addingSub = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.subAddFail'))),
      });
  }

  saveSub(sub: OpsSubService): void {
    if (this.denyManage()) {
      return;
    }
    if (!this.hasNames(sub.nameAr, sub.nameEn)) {
      this.toast.show(this.locale.t('ops.ui.needNames'));
      return;
    }
    this.api
      .opsPatchSubService(sub.id, {
        nameAr: sub.nameAr.trim(),
        nameEn: sub.nameEn.trim(),
        sortOrder: Number(sub.sortOrder) || 0,
      })
      .subscribe({
        next: (row) => {
          Object.assign(sub, row);
          this.toast.show(this.locale.t('ops.cat.toast.subSaved'));
        },
        error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.saveGenericFail'))),
      });
  }

  toggleSub(sub: OpsSubService): void {
    if (this.denyManage()) {
      return;
    }
    this.api.opsPatchSubService(sub.id, { isVisible: !sub.isVisible }).subscribe({
      next: (row) => {
        sub.isVisible = row.isVisible;
        this.toast.show(row.isVisible ? this.locale.t('ops.cat.toast.subVisible') : this.locale.t('ops.cat.toast.subHidden'));
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.ui.visibilityFail'))),
    });
  }

  async removeSub(sub: OpsSubService): Promise<void> {
    if (this.denyManage()) {
      return;
    }
    const ok = await this.confirm.ask({
      title: this.locale.t('ops.ui.confirmDelete'),
      message: this.locale.tf('ops.ui.deleteNamed', { name: this.locale.localizedName(sub) }),
      confirmLabel: this.locale.t('ui.delete'),
      cancelLabel: this.locale.t('ui.cancel'),
    });
    if (!ok) {
      return;
    }
    this.api.opsDeleteSubService(sub.id).subscribe({
      next: () => {
        this.toast.show(this.locale.t('ops.cat.toast.subDeleted'));
        this.selectedSub = null;
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.subDeleteFail'))),
    });
  }

  private finishCreate(message?: string): void {
    if (message) {
      this.toast.show(message);
    }
    this.serviceDraft = emptyServiceDraft();
    this.resetDraftImage();
    this.adding = false;
    this.load();
  }

  private applyService(row: OpsCatalogService): void {
    this.services = this.services.map((item) => (item.id === row.id ? { ...item, ...row } : item));
    if (this.selected?.id === row.id) {
      this.selected = { ...this.selected, ...row };
    }
  }

  private fileFrom(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (file && !/^image\/(jpeg|png|webp|jpg)$/i.test(file.type)) {
      this.toast.show(this.locale.t('ops.ui.imageType'));
      return null;
    }
    return file;
  }

  private resetDraftImage(): void {
    if (this.draftPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.draftPreview);
    }
    this.draftFile = null;
    this.draftPreview = null;
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
    this.api.opsCatalog().subscribe({
      next: (services) => {
        this.services = services;
        this.selected = keepSelected(this.services, this.selected);
        this.selectedSub = this.selected
          ? keepSelected(this.selected.subServices, this.selectedSub)
          : null;
        if (this.selected) {
          this.shell.set(this.locale.localizedName(this.selected), this.locale.t('ops.catalog.subs'));
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('ops.cat.toast.loadFail')));
      },
    });
  }
}
