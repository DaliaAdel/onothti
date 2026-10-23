import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import { isLiveSubscription, servicePhoto, type CatalogService, type ProviderServiceRow, type ProviderSubscription } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-services',
  imports: [RouterLink, FormsModule],
  template: `
    @if (locked) {
      <div class="page-head"><div><h1>الميزة غير متاحة</h1><p>يجب تفعيل الاشتراك أولًا</p></div></div>
      <div class="card subscription-lock">
        <div class="symbol">♢</div>
        <h2>اشتركي لتفعيل أدوات الخبيرة</h2>
        <p class="muted">بعد اختيار الباقة واعتماد الدفع يمكنكِ إضافة الخدمات ورفع الألبومات واستخدام الإحصاءات والتقييمات.</p>
        <a class="btn primary" routerLink="/p/package">عرض الباقات</a>
      </div>
    } @else if (mode === 'add') {
      <div class="page-head">
        <div>
          <h1>إضافة خدمة جديدة</h1>
          <p>اختاري الخدمة الرئيسية ثم خدمة فرعية أو أكثر</p>
        </div>
        <button class="btn secondary" type="button" (click)="mode = 'list'">← الرجوع إلى خدماتي</button>
      </div>
      <div class="service-steps">
        <span [class.active]="!!serviceId"><i>1</i>الخدمة الرئيسية</span>
        <b></b>
        <span [class.active]="hasSubSelection"><i>2</i>الخدمة الفرعية</span>
        <b></b>
        <span [class.active]="!!serviceId && hasSubSelection"><i>3</i>المراجعة والحفظ</span>
      </div>
      <div class="card add-service-section">
        <div class="section-title"><div><h3>اختاري الخدمة الرئيسية</h3><p class="small muted">يمكن اختيار خدمة رئيسية واحدة في كل مرة.</p></div></div>
        @if (!selectableCatalog.length) {
          <p class="muted small">باقتك الحالية لا تشمل خدمات رئيسية متاحة للإضافة.</p>
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
            <h3>اختاري الخدمات الفرعية</h3>
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
          <h3>مراجعة الاختيار</h3>
          <p class="small muted">الخدمة الرئيسية: <b>{{ selectedMainName }}</b></p>
          <p class="small muted">الخدمات الفرعية: <b>{{ selectedSubName }}</b></p>
        </div>
        <button class="btn primary" type="button" [disabled]="loading || !serviceId || !hasSubSelection" (click)="add()">إضافة إلى خدماتي</button>
      </div>
    } @else if (mode === 'edit' && editingGroup) {
      <div class="page-head">
        <div>
          <h1>تعديل الخدمة</h1>
          <p>الخدمات الفرعية التابعة لـ {{ locale.localizedName(editingGroup.service) }}</p>
        </div>
        <button class="btn secondary" type="button" (click)="closeEdit()">← الرجوع إلى خدماتي</button>
      </div>
      <div class="card edit-service-form">
        <div class="edit-service-heading">
          <img class="service-edit-photo" [src]="photoFor(editingGroup.service)" alt="" />
          <div>
            <h2>{{ locale.localizedName(editingGroup.service) }}</h2>
            <p class="small muted">{{ editingGroup.items.length === 1 ? 'خدمة فرعية واحدة' : editingGroup.items.length + ' خدمات فرعية' }}</p>
          </div>
        </div>
        <div class="list">
          @for (item of editingGroup.items; track item.id) {
            <div class="list-row">
              <div class="copy">
                <b>{{ item.subService ? locale.localizedName(item.subService) : 'الخدمة الرئيسية' }}</b>
                <p>{{ isItemActive(item) ? 'نشطة' : 'غير نشطة' }}</p>
              </div>
              <span class="status" [class.success]="isItemActive(item)" [class.warning]="!isItemActive(item)">
                {{ isItemActive(item) ? 'نشطة' : 'غير نشطة' }}
              </span>
              <button class="favorite service-delete" type="button" [disabled]="loading" aria-label="حذف الخدمة الفرعية" (click)="removeSub(item)">×</button>
            </div>
          }
        </div>
        <div class="edit-service-actions">
          <button class="btn ghost" type="button" [disabled]="loading" (click)="removeMainFromEdit()">حذف الخدمة الرئيسية</button>
          <button class="btn secondary" type="button" (click)="closeEdit()">رجوع</button>
        </div>
      </div>
    } @else {
      <div class="page-head">
        <div>
          <h1>خدماتي</h1>
          <p>أديري خدماتك وترتيب ظهورها</p>
        </div>
        <button class="btn primary" type="button" (click)="openAdd()">إضافة خدمة</button>
      </div>
      <div class="grid cols-2">
        <div class="card">
          <h3>الخدمات</h3>
          @if (!items.length) {
            <p class="muted small">لا توجد خدمات مضافة بعد.</p>
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
                  <b class="drag-handle" title="اسحبي لإعادة الترتيب">⋮⋮</b>
                  <img class="service-row-photo" [src]="photoFor(group.service)" alt="" />
                  <div class="copy">
                    <b>{{ locale.localizedName(group.service) }}</b>
                    <p>{{ groupSubNames(group) }}</p>
                  </div>
                  <span class="status" [class.success]="isGroupActive(group)" [class.warning]="!isGroupActive(group)">
                    {{ isGroupActive(group) ? 'نشطة' : 'غير نشطة' }}
                  </span>
                  <button class="favorite" type="button" aria-label="تعديل الخدمة" (click)="openEdit(group.items[0]); $event.stopPropagation()" (mousedown)="$event.stopPropagation()">✎</button>
                  <button class="favorite service-delete" type="button" aria-label="حذف الخدمة الرئيسية" (click)="removeMain(group); $event.stopPropagation()" (mousedown)="$event.stopPropagation()">×</button>
                </div>
              }
            </div>
          }
        </div>
        <div class="card">
          <h3>ترتيب ظهور الخدمات</h3>
          <p class="muted small">اسحبي الخدمات لتغيير ترتيبها حسب الباقة النشطة.</p>
          <div class="notice">يمكنكِ تعديل مدينة تقديم الخدمات من الملف الشخصي.</div>
          <br />
          <a class="btn secondary" routerLink="/p/account">الانتقال إلى الملف الشخصي</a>
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
      return 'اختاري الخدمة الرئيسية أولًا.';
    }
    if (!this.subServiceIds.length) {
      return 'تقدري تختاري أكتر من خدمة فرعية.';
    }
    return this.subServiceIds.length === 1
      ? 'تم اختيار خدمة فرعية واحدة.'
      : `تم اختيار ${this.subServiceIds.length} خدمات فرعية.`;
  }

  get selectedSubName(): string {
    const names = this.subServices
      .filter((item) => this.subServiceIds.includes(item.id))
      .map((item) => this.locale.localizedName(item));
    return names.length ? names.join('، ') : '—';
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
    this.shell.set('خدماتي');
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
    this.shell.set('إضافة خدمة');
  }

  openEdit(item: ProviderServiceRow): void {
    this.mode = 'edit';
    this.editing = item;
    this.editingServiceId = item.serviceId;
    this.shell.set('تعديل الخدمة');
  }

  closeEdit(): void {
    this.mode = 'list';
    this.editing = null;
    this.editingServiceId = '';
    this.shell.set('خدماتي');
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
    return names.length ? names.join('، ') : 'الخدمة الرئيسية';
  }

  removeMain(group: { serviceId: string; service: CatalogService; items: ProviderServiceRow[] }): void {
    const name = this.locale.localizedName(group.service);
    const subCount = group.items.length;
    const message =
      subCount > 1
        ? `سيتم حذف «${name}» وكل خدماتها الفرعية (${subCount}). هل تريدين المتابعة؟`
        : `سيتم حذف «${name}» وكل خدماتها الفرعية. هل تريدين المتابعة؟`;
    if (!window.confirm(message)) {
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

  removeSub(item: ProviderServiceRow): void {
    const name = item.subService ? this.locale.localizedName(item.subService) : 'هذه الخدمة الفرعية';
    if (!window.confirm(`سيتم حذف «${name}». هل تريدين المتابعة؟`)) {
      return;
    }
    this.loading = true;
    this.api.removeProviderService(item.id).subscribe({
      next: () => {
        this.loading = false;
        this.toast.show('تم حذف الخدمة الفرعية');
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
        this.toast.show(apiMessage(err, 'تعذر حذف الخدمة الفرعية'));
      },
    });
  }

  private deleteMainService(serviceId: string): void {
    this.loading = true;
    this.api.removeProviderMainService(serviceId).subscribe({
      next: () => {
        this.loading = false;
        this.toast.show('تم حذف الخدمة الرئيسية وكل خدماتها الفرعية');
        if (this.mode === 'edit') {
          this.closeEdit();
        }
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر حذف الخدمة'));
      },
    });
  }

  add(): void {
    if (!this.serviceId || !this.subServiceIds.length) {
      this.toast.show('اختاري خدمة رئيسية وفرعية واحدة على الأقل');
      return;
    }
    this.loading = true;
    this.api.addProviderService({ serviceId: this.serviceId, subServiceIds: this.subServiceIds }).subscribe({
      next: () => {
        this.loading = false;
        this.mode = 'list';
        this.shell.set('خدماتي');
        this.toast.show(this.subServiceIds.length > 1 ? 'تمت إضافة الخدمات' : 'تمت إضافة الخدمة');
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر إضافة الخدمة'));
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
        this.toast.show('تم حفظ ترتيب الخدمات');
      },
      error: (err) => {
        this.toast.show(apiMessage(err, 'تعذر حفظ الترتيب'));
        this.reload();
      },
    });
  }

  private reload(): void {
    this.api.providerServices().subscribe({ next: (items) => (this.items = items) });
  }
}
