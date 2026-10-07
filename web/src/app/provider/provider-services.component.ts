import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import { isLiveSubscription, serviceIcon, type CatalogService, type ProviderServiceRow, type ProviderSubscription } from '../core/models';
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
          <p>اختاري الخدمة الرئيسية والفرعية</p>
        </div>
        <button class="btn secondary" type="button" (click)="mode = 'list'">← الرجوع إلى خدماتي</button>
      </div>
      <div class="service-steps">
        <span [class.active]="!!serviceId"><i>1</i>الخدمة الرئيسية</span>
        <b></b>
        <span [class.active]="!!subServiceId"><i>2</i>الخدمة الفرعية</span>
        <b></b>
        <span [class.active]="!!serviceId && !!subServiceId"><i>3</i>المراجعة والحفظ</span>
      </div>
      <div class="card add-service-section">
        <div class="section-title"><div><h3>اختاري الخدمة الرئيسية</h3><p class="small muted">يمكن اختيار خدمة رئيسية واحدة في كل مرة.</p></div></div>
        <div class="add-service-grid">
          @for (service of catalog; track service.id) {
            <button class="add-service-card" type="button" [class.selected]="serviceId === service.id" (click)="pickMain(service.id)">
              <img [src]="iconFor(service)" alt="" loading="lazy" decoding="async" />
              <span>{{ locale.localizedName(service) }}</span>
              <i>✓</i>
            </button>
          }
        </div>
      </div>
      <div class="card add-service-section">
        <div class="section-title">
          <div>
            <h3>اختاري الخدمة الفرعية</h3>
            <p class="small muted">{{ serviceId ? 'اختاري خدمة فرعية واحدة.' : 'اختاري الخدمة الرئيسية أولًا.' }}</p>
          </div>
        </div>
        <div class="chips add-subservices">
          @for (sub of subServices; track sub.id) {
            <button class="chip" type="button" [class.active]="subServiceId === sub.id" [disabled]="!serviceId" (click)="subServiceId = sub.id">
              {{ locale.localizedName(sub) }}
            </button>
          }
        </div>
      </div>
      <div class="card service-review">
        <div>
          <h3>مراجعة الاختيار</h3>
          <p class="small muted">الخدمة الرئيسية: <b>{{ selectedMainName }}</b></p>
          <p class="small muted">الخدمة الفرعية: <b>{{ selectedSubName }}</b></p>
        </div>
        <button class="btn primary" type="button" [disabled]="loading || !serviceId || !subServiceId" (click)="add()">إضافة إلى خدماتي</button>
      </div>
    } @else if (mode === 'edit' && editing) {
      <div class="page-head">
        <div>
          <h1>تعديل الخدمة</h1>
          <p>حدّثي بيانات الخدمة المحددة</p>
        </div>
        <button class="btn secondary" type="button" (click)="closeEdit()">← الرجوع إلى خدماتي</button>
      </div>
      <div class="card edit-service-form">
        <div class="edit-service-heading">
          <div class="service-edit-icon">✎</div>
          <div>
            <h2>{{ locale.localizedName(editing.service) }}</h2>
            <p class="small muted">{{ editing.subService ? locale.localizedName(editing.subService) : 'الخدمة الرئيسية' }}</p>
          </div>
        </div>
        <div class="grid cols-2">
          <div class="field">
            <label>اسم الخدمة</label>
            <input [value]="editDisplayName" disabled />
          </div>
          <div class="field">
            <label>حالة الخدمة</label>
            <select [(ngModel)]="editStatus" name="editStatus">
              <option value="active">نشطة</option>
              <option value="inactive">غير نشطة</option>
            </select>
          </div>
        </div>
        <div class="edit-service-actions">
          <button class="btn secondary" type="button" (click)="closeEdit()">إلغاء</button>
          <button class="btn primary" type="button" [disabled]="loading || !editDirty" (click)="saveEdit()">حفظ التعديلات</button>
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
              @for (item of items; track item.id; let i = $index) {
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
                  <div class="copy">
                    <b>{{ locale.localizedName(item.service) }}</b>
                    <p>{{ item.subService ? locale.localizedName(item.subService) : 'الخدمة الرئيسية' }}</p>
                  </div>
                  <span class="status" [class.success]="isItemActive(item)" [class.warning]="!isItemActive(item)">
                    {{ isItemActive(item) ? 'نشطة' : 'غير نشطة' }}
                  </span>
                  <button class="favorite" type="button" aria-label="تعديل الخدمة" (click)="openEdit(item); $event.stopPropagation()" (mousedown)="$event.stopPropagation()">✎</button>
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
  subServiceId = '';
  loading = false;
  mode: 'list' | 'add' | 'edit' = 'list';
  locked = false;
  editing: ProviderServiceRow | null = null;
  editStatus: 'active' | 'inactive' = 'active';
  dragIndex: number | null = null;
  overIndex: number | null = null;
  private orderBeforeDrag: string[] = [];

  get subServices() {
    return this.catalog.find((item) => item.id === this.serviceId)?.subServices ?? [];
  }

  get selectedMainName(): string {
    const service = this.catalog.find((item) => item.id === this.serviceId);
    return service ? this.locale.localizedName(service) : '—';
  }

  get selectedSubName(): string {
    const sub = this.subServices.find((item) => item.id === this.subServiceId);
    return sub ? this.locale.localizedName(sub) : '—';
  }

  get editDisplayName(): string {
    if (!this.editing) {
      return '';
    }
    return this.editing.subService
      ? this.locale.localizedName(this.editing.subService)
      : this.locale.localizedName(this.editing.service);
  }

  get editDirty(): boolean {
    if (!this.editing) {
      return false;
    }
    return this.editStatus !== (this.isItemActive(this.editing) ? 'active' : 'inactive');
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

  iconFor(service: CatalogService | string): string {
    return serviceIcon(service);
  }

  pickMain(id: string): void {
    this.serviceId = id;
    this.subServiceId = '';
  }

  openAdd(): void {
    this.mode = 'add';
    this.serviceId = '';
    this.subServiceId = '';
    this.editing = null;
    this.shell.set('إضافة خدمة');
  }

  openEdit(item: ProviderServiceRow): void {
    this.mode = 'edit';
    this.editing = item;
    this.editStatus = this.isItemActive(item) ? 'active' : 'inactive';
    this.shell.set('تعديل الخدمة');
  }

  closeEdit(): void {
    this.mode = 'list';
    this.editing = null;
    this.shell.set('خدماتي');
  }

  isItemActive(item: ProviderServiceRow): boolean {
    return item.isActive !== false;
  }

  saveEdit(): void {
    if (!this.editing || !this.editDirty) {
      return;
    }
    this.loading = true;
    this.api.patchProviderService(this.editing.id, { isActive: this.editStatus === 'active' }).subscribe({
      next: () => {
        this.loading = false;
        this.toast.show('تم حفظ تعديلات الخدمة');
        this.closeEdit();
        this.reload();
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر حفظ التعديلات'));
      },
    });
  }

  add(): void {
    if (!this.serviceId || !this.subServiceId) {
      this.toast.show('اختاري خدمة رئيسية وفرعية');
      return;
    }
    this.loading = true;
    this.api.addProviderService({ serviceId: this.serviceId, subServiceId: this.subServiceId }).subscribe({
      next: () => {
        this.loading = false;
        this.mode = 'list';
        this.shell.set('خدماتي');
        this.toast.show('تمت إضافة الخدمة');
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
    if (this.items.length < 2 || target?.closest('button')) {
      event.preventDefault();
      return;
    }
    this.dragIndex = index;
    this.overIndex = index;
    this.orderBeforeDrag = this.items.map((item) => item.id);
    event.dataTransfer?.setData('text/plain', this.items[index].id);
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
    const next = [...this.items];
    const [moved] = next.splice(this.dragIndex, 1);
    next.splice(index, 0, moved);
    this.items = next;
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
