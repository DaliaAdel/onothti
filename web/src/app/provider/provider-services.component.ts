import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import { isLiveSubscription, servicePhoto, type CatalogService, type ProviderServiceRow, type ProviderSubscription } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-services',
  imports: [RouterLink, FormsModule],
  template: `
    @if (locked) {
      <div class="page-head"><div><h1>{{ locale.t('p.locked.title') }}</h1><p>{{ locale.t('p.locked.sub') }}</p></div></div>
      <div class="card subscription-lock">
        <div class="symbol">♢</div>
        <h2>{{ locale.t('p.locked.ctaTitle') }}</h2>
        <p class="muted">{{ locale.t('p.locked.ctaText') }}</p>
        <a class="btn primary" routerLink="/p/package">{{ locale.t('p.locked.viewPackages') }}</a>
      </div>
    } @else if (mode === 'add') {
      <div class="page-head">
        <div>
          <h1>{{ locale.t('p.svc.addTitle') }}</h1>
          <p>{{ locale.t('p.svc.addSub') }}</p>
        </div>
        <button class="btn secondary back" type="button" (click)="mode = 'list'">{{ locale.t('p.svc.back') }}</button>
      </div>
      <div class="service-steps">
        <span [class.active]="!!serviceId"><i>1</i>{{ locale.t('p.svc.stepMain') }}</span>
        <b></b>
        <span [class.active]="hasSubSelection"><i>2</i>{{ locale.t('p.svc.stepSub') }}</span>
        <b></b>
        <span [class.active]="!!serviceId && hasSubSelection"><i>3</i>{{ locale.t('p.svc.stepReview') }}</span>
      </div>
      <div class="card add-service-section">
        <div class="section-title"><div><h3>{{ locale.t('p.svc.pickMain') }}</h3><p class="small muted">{{ locale.t('p.svc.pickMainHint') }}</p></div></div>
        @if (!selectableCatalog.length) {
          <p class="muted small">{{ locale.t('p.svc.noMain') }}</p>
        }
        <div class="add-service-grid">
          @for (service of selectableCatalog; track service.id) {
            <button class="add-service-card" type="button" [class.selected]="serviceId === service.id" (click)="pickMain(service.id)">
              <img class="add-service-photo" [class.has-photo]="!!service.imageUrl" [src]="photoFor(service)" alt="" loading="lazy" decoding="async" />
              <span>{{ locale.localizedName(service) }}</span>
              <i>✓</i>
            </button>
          }
        </div>
      </div>
      <div class="card add-service-section">
        <div class="section-title">
          <div>
            <h3>{{ locale.t('p.svc.pickSubs') }}</h3>
            <p class="small muted">{{ subHint }}</p>
          </div>
        </div>
        <div class="chips add-subservices">
          @for (sub of subServices; track sub.id) {
            <button class="chip" type="button" [class.active]="isSubPicked(sub.id)" [disabled]="!serviceId" (click)="toggleSub(sub.id)">
              {{ locale.localizedName(sub) }}
            </button>
          }
        </div>
      </div>
      <div class="card service-review">
        <div>
          <h3>{{ locale.t('p.svc.review') }}</h3>
          <p class="small muted">{{ locale.t('p.svc.mainLabel') }} <b>{{ selectedMainName }}</b></p>
          <p class="small muted">{{ locale.t('p.svc.subLabel') }} <b>{{ selectedSubName }}</b></p>
        </div>
        <button class="btn primary" type="button" [disabled]="loading || !serviceId || !hasSubSelection" (click)="add()">{{ locale.t('p.svc.addToMine') }}</button>
      </div>
    } @else if (mode === 'edit' && editingGroup) {
      <div class="page-head">
        <div>
          <h1>{{ locale.t('p.svc.editTitle') }}</h1>
          <p>{{ locale.tf('p.svc.editSub', { name: locale.localizedName(editingGroup.service) }) }}</p>
        </div>
        <button class="btn secondary back" type="button" (click)="closeEdit()">{{ locale.t('p.svc.back') }}</button>
      </div>
      <div class="card edit-service-form">
        <div class="edit-service-heading">
          <img class="service-edit-photo" [src]="photoFor(editingGroup.service)" alt="" />
          <div>
            <h2>{{ locale.localizedName(editingGroup.service) }}</h2>
            <p class="small muted">{{ editingGroup.items.length === 1 ? locale.t('p.svc.oneSub') : locale.tf('p.svc.nSubs', { n: editingGroup.items.length }) }}</p>
          </div>
        </div>
        <div class="list">
          @for (item of editingGroup.items; track item.id) {
            <div class="list-row">
              <div class="copy">
                <b>{{ item.subService ? locale.localizedName(item.subService) : locale.t('p.svc.mainItem') }}</b>
                <p>{{ isItemActive(item) ? locale.t('ui.active') : locale.t('ui.inactive') }}</p>
              </div>
              <span class="status" [class.success]="isItemActive(item)" [class.warning]="!isItemActive(item)">
                {{ isItemActive(item) ? locale.t('ui.active') : locale.t('ui.inactive') }}
              </span>
              <button class="favorite service-delete" type="button" [disabled]="loading" [attr.aria-label]="locale.t('p.svc.deleteSub')" (click)="removeSub(item)">×</button>
            </div>
          }
        </div>
        <div class="edit-service-actions">
          <button class="btn ghost" type="button" [disabled]="loading" (click)="removeMainFromEdit()">{{ locale.t('p.svc.deleteMain') }}</button>
          <button class="btn secondary back" type="button" (click)="closeEdit()">{{ locale.t('ui.back') }}</button>
        </div>
      </div>
    } @else {
      <div class="page-head">
        <div>
          <h1>{{ locale.t('p.svc.listTitle') }}</h1>
          <p>{{ locale.t('p.svc.listSub') }}</p>
        </div>
        <button class="btn primary" type="button" (click)="openAdd()">{{ locale.t('p.servicesAdd') }}</button>
      </div>
      <div class="grid cols-2">
        <div class="card">
          <h3>{{ locale.t('nav.services') }}</h3>
          @if (!items.length) {
            <p class="muted small">{{ locale.t('p.svc.empty') }}</p>
          } @else {
            <div class="list">
              @for (group of serviceGroups; track group.serviceId; let i = $index) {
                <div
                  class="list-row"
                  [class.is-dragging]="dragIndex === i"
                  [class.drag-over]="overIndex === i && dragIndex !== i"
                  draggable="true"
                  (dragstart)="onDragStart($event, i)"
                  (dragover)="onDragOver($event, i)"
                  (dragleave)="onDragLeave(i)"
                  (drop)="onDrop($event, i)"
                  (dragend)="onDragEnd()"
                >
                  <b class="drag-handle" [attr.title]="locale.t('p.svc.reorder')">⋮⋮</b>
                  <img class="service-row-photo" [src]="photoFor(group.service)" alt="" />
                  <div class="copy">
                    <b>{{ locale.localizedName(group.service) }}</b>
                    <p>{{ groupSubNames(group) }}</p>
                  </div>
                  <span class="status" [class.success]="isGroupActive(group)" [class.warning]="!isGroupActive(group)">
                    {{ isGroupActive(group) ? locale.t('ui.active') : locale.t('ui.inactive') }}
                  </span>
                  <button class="favorite" type="button" [attr.aria-label]="locale.t('p.svc.editTitle')" (click)="openEdit(group.items[0]); $event.stopPropagation()" (mousedown)="$event.stopPropagation()">✎</button>
                  <button class="favorite service-delete" type="button" [attr.aria-label]="locale.t('p.svc.deleteMain')" (click)="removeMain(group); $event.stopPropagation()" (mousedown)="$event.stopPropagation()">×</button>
                </div>
              }
            </div>
          }
        </div>
        <div class="card">
          <h3>{{ locale.t('p.svc.reorder') }}</h3>
          <p class="muted small">{{ locale.t('p.svc.listSub') }}</p>
          <div class="notice">{{ locale.t('p.acc.sub') }}</div>
          <br />
          <a class="btn secondary" routerLink="/p/account">{{ locale.t('nav.profile') }}</a>
        </div>
      </div>
    }
  `,
})
export class ProviderServicesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly toast = inject(ToastService);
  readonly locale = inject(LocaleService);
  private readonly confirm = inject(ConfirmService);

  catalog: CatalogService[] = [];
  items: ProviderServiceRow[] = [];
  subscription: ProviderSubscription | null = null;
  serviceId = '';
  subServiceIds: string[] = [];
  loading = false;
  mode: 'list' | 'add' | 'edit' = 'list';
  locked = false;
  editing: ProviderServiceRow | null = null;
  editingServiceId = '';
  dragIndex: number | null = null;
  overIndex: number | null = null;
  private orderBeforeDrag: string[] = [];

  get selectableCatalog(): CatalogService[] {
    const allowed = this.subscription?.package?.serviceIds;
    if (!allowed) {
      return this.catalog;
    }
    return this.catalog.filter((service) => allowed.includes(service.id));
  }

  get subServices() {
    return this.catalog.find((item) => item.id === this.serviceId)?.subServices ?? [];
  }

  get selectedMainName(): string {
    const service = this.catalog.find((item) => item.id === this.serviceId);
    return service ? this.locale.localizedName(service) : '—';
  }

  get hasSubSelection(): boolean {
    return this.subServiceIds.length > 0;
  }

  get subHint(): string {
    if (!this.serviceId) {
      return this.locale.t('p.svc.hintPickMain');
    }
    if (!this.subServiceIds.length) {
      return this.locale.t('p.svc.hintPickSubs');
    }
    return this.subServiceIds.length === 1
      ? this.locale.t('p.svc.hintOne')
      : this.locale.tf('p.svc.hintN', { n: this.subServiceIds.length });
  }

  get selectedSubName(): string {
    const names = this.subServices
      .filter((item) => this.subServiceIds.includes(item.id))
      .map((item) => this.locale.localizedName(item));
    return names.length ? names.join(this.locale.lang() === 'ar' ? '، ' : ', ') : '—';
  }

  get serviceGroups(): { serviceId: string; service: CatalogService; items: ProviderServiceRow[] }[] {
    const groups: { serviceId: string; service: CatalogService; items: ProviderServiceRow[] }[] = [];
    const index = new Map<string, (typeof groups)[number]>();
    for (const item of this.items) {
      let group = index.get(item.serviceId);
      if (!group) {
        group = { serviceId: item.serviceId, service: item.service, items: [] };
        index.set(item.serviceId, group);
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }

  get editingGroup(): { serviceId: string; service: CatalogService; items: ProviderServiceRow[] } | null {
    if (!this.editingServiceId) {
      return null;
    }
    return this.serviceGroups.find((group) => group.serviceId === this.editingServiceId) ?? null;
  }

  ngOnInit(): void {
    this.shell.set('nav.myServices');
    this.api.services().subscribe({ next: (services) => (this.catalog = services) });
    this.api.providerSubscription().subscribe({
      next: (data) => {
        this.subscription = data.current;
        this.locked = !isLiveSubscription(data.current);
      },
    });
    this.reload();
  }

  photoFor(service: CatalogService): string {
    return servicePhoto(service);
  }

  pickMain(id: string): void {
    this.serviceId = id;
    this.subServiceIds = [];
  }

  isSubPicked(id: string): boolean {
    return this.subServiceIds.includes(id);
  }

  toggleSub(id: string): void {
    if (!this.serviceId) {
      return;
    }
    if (this.subServiceIds.includes(id)) {
      this.subServiceIds = this.subServiceIds.filter((item) => item !== id);
      return;
    }
    this.subServiceIds = [...this.subServiceIds, id];
  }

  openAdd(): void {
    this.mode = 'add';
    this.serviceId = '';
    this.subServiceIds = [];
    this.editing = null;
    this.editingServiceId = '';
    this.shell.set('p.servicesAdd');
  }

  openEdit(item: ProviderServiceRow): void {
    this.mode = 'edit';
    this.editing = item;
    this.editingServiceId = item.serviceId;
    this.shell.set('p.servicesEdit');
  }

  closeEdit(): void {
    this.mode = 'list';
    this.editing = null;
    this.editingServiceId = '';
    this.shell.set('nav.myServices');
  }

  isItemActive(item: ProviderServiceRow): boolean {
    return item.isActive !== false;
  }

  isGroupActive(group: { items: ProviderServiceRow[] }): boolean {
    return group.items.some((item) => this.isItemActive(item));
  }

  groupSubNames(group: { items: ProviderServiceRow[] }): string {
    const names = group.items
      .map((item) => (item.subService ? this.locale.localizedName(item.subService) : ''))
      .filter((name) => name);
    return names.length ? names.join(this.locale.lang() === 'ar' ? '، ' : ', ') : this.locale.t('p.svc.mainItem');
  }

  async removeMain(group: { serviceId: string; service: CatalogService; items: ProviderServiceRow[] }): Promise<void> {
    const name = this.locale.localizedName(group.service);
    const subCount = group.items.length;
    const message =
      subCount > 1
        ? this.locale.tf('p.svc.deleteMainMsg', { name, n: subCount })
        : this.locale.tf('p.svc.deleteMainMsgOne', { name });
    const ok = await this.confirm.ask({
      title: this.locale.t('ops.ui.confirmDelete'),
      message,
      confirmLabel: this.locale.t('ui.delete'),
      cancelLabel: this.locale.t('ui.cancel'),
    });
    if (!ok) {
      return;
    }
    this.deleteMainService(group.serviceId);
  }

  removeMainFromEdit(): void {
    if (!this.editingGroup) {
      return;
    }
    this.removeMain(this.editingGroup);
  }

  async removeSub(item: ProviderServiceRow): Promise<void> {
    const name = item.subService ? this.locale.localizedName(item.subService) : this.locale.t('p.svc.thisSub');
    const ok = await this.confirm.ask({
      title: this.locale.t('ops.ui.confirmDelete'),
      message: this.locale.tf('p.svc.deleteSubMsg', { name }),
      confirmLabel: this.locale.t('ui.delete'),
      cancelLabel: this.locale.t('ui.cancel'),
    });
    if (!ok) {
      return;
    }
    this.loading = true;
    this.api.removeProviderService(item.id).subscribe({
      next: () => {
        this.loading = false;
        this.toast.show(this.locale.t('p.svc.toast.subDeleted'));
        this.api.providerServices().subscribe({
          next: (items) => {
            this.items = items;
            if (!this.editingGroup) {
              this.closeEdit();
            }
          },
        });
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('p.svc.toast.subDeleteFail')));
      },
    });
  }

  private deleteMainService(serviceId: string): void {
    this.loading = true;
    this.api.removeProviderMainService(serviceId).subscribe({
      next: () => {
        this.loading = false;
        this.toast.show(this.locale.t('p.svc.toast.mainDeleted'));
        if (this.mode === 'edit') {
          this.closeEdit();
        }
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('p.svc.toast.mainDeleteFail')));
      },
    });
  }

  add(): void {
    if (!this.serviceId || !this.subServiceIds.length) {
      this.toast.show(this.locale.t('p.svc.needPick'));
      return;
    }
    this.loading = true;
    this.api.addProviderService({ serviceId: this.serviceId, subServiceIds: this.subServiceIds }).subscribe({
      next: () => {
        this.loading = false;
        this.mode = 'list';
        this.shell.set('nav.myServices');
        this.toast.show(this.subServiceIds.length > 1 ? this.locale.t('p.svc.toast.addedMany') : this.locale.t('p.svc.toast.addedOne'));
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, this.locale.t('p.svc.toast.addFail')));
      },
    });
  }

  onDragStart(event: DragEvent, index: number): void {
    const target = event.target as HTMLElement | null;
    const groups = this.serviceGroups;
    if (groups.length < 2 || target?.closest('button')) {
      event.preventDefault();
      return;
    }
    this.dragIndex = index;
    this.overIndex = index;
    this.orderBeforeDrag = this.items.map((item) => item.id);
    event.dataTransfer?.setData('text/plain', groups[index].serviceId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.dragIndex == null || this.dragIndex === index) {
      return;
    }
    const groups = this.serviceGroups;
    const [moved] = groups.splice(this.dragIndex, 1);
    groups.splice(index, 0, moved);
    this.items = groups.flatMap((group) => group.items);
    this.dragIndex = index;
    this.overIndex = index;
  }

  onDragLeave(index: number): void {
    if (this.overIndex === index) {
      this.overIndex = null;
    }
  }

  onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    this.onDragOver(event, index);
    this.persistOrder();
  }

  onDragEnd(): void {
    this.dragIndex = null;
    this.overIndex = null;
    this.persistOrder();
  }

  private persistOrder(): void {
    const ids = this.items.map((item) => item.id);
    if (!this.orderBeforeDrag.length || ids.join() === this.orderBeforeDrag.join()) {
      return;
    }
    this.orderBeforeDrag = ids;
    this.api.reorderProviderServices(ids).subscribe({
      next: (items) => {
        this.items = items;
        this.toast.show(this.locale.t('p.svc.toast.orderSaved'));
      },
      error: (err) => {
        this.toast.show(apiMessage(err, this.locale.t('p.svc.toast.orderFail')));
        this.reload();
      },
    });
  }

  private reload(): void {
    this.api.providerServices().subscribe({ next: (items) => (this.items = items) });
  }
}
