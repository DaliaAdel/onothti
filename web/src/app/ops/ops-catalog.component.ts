import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsCatalogService, OpsSubService } from '../core/models';
import { ShellService } from '../core/shell.service';
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
          <h2>الخدمات والخدمات الفرعية</h2>
          <p>اضغطي على صف الخدمة لعرض خدماتها الفرعية</p>
        </div>
        <button class="btn primary" type="button" (click)="openAdd()">+ إضافة خدمة</button>
      </div>

      <app-ops-modal [open]="adding" title="إضافة خدمة رئيسية" kicker="كتالوج المنصة" (closed)="closeAdd()">
        <div class="form-grid">
          <div class="field">
            <label>الاسم *</label>
            <input class="input" [(ngModel)]="serviceDraft.nameAr" placeholder="الشعر" />
          </div>
          <div class="field">
            <label>الاسم الإنجليزي *</label>
            <input class="input" [(ngModel)]="serviceDraft.nameEn" placeholder="Hair" />
          </div>
          <div class="field">
            <label>الترتيب</label>
            <input class="input" inputmode="numeric" positiveInt [(ngModel)]="serviceDraft.sortOrder" />
          </div>
          <div class="field full">
            <label>صورة الخدمة</label>
            <div class="ops-service-image">
              @if (draftPreview) {
                <img class="ops-service-preview" [src]="draftPreview" alt="" />
              }
              <input type="file" accept="image/jpeg,image/png,image/webp" (change)="onDraftImage($event)" />
            </div>
          </div>
        </div>
        <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createService()">إضافة الخدمة</button>
      </app-ops-modal>

      @if (loading) {
        <p class="loading">جاري التحميل...</p>
      } @else if (!services.length) {
        <p class="page-empty">لا توجد خدمات بعد.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>الصورة</th>
                <th>الاسم</th>
                <th>الاسم الإنجليزي</th>
                <th>فرعية</th>
                <th>الترتيب</th>
                <th>الظهور</th>
              </tr>
            </thead>
            <tbody>
              @for (service of services; track service.id) {
                <tr (click)="openService(service)">
                  <td>
                    @if (service.imageUrl) {
                      <img class="ops-thumb" [src]="service.imageUrl" alt="" />
                    } @else {
                      <span class="muted small">بدون صورة</span>
                    }
                  </td>
                  <td><b>{{ service.nameAr }}</b></td>
                  <td>{{ service.nameEn }}</td>
                  <td>{{ service.subServices.length }}</td>
                  <td>{{ service.sortOrder }}</td>
                  <td>
                    <span class="status {{ service.isVisible ? 'success' : 'error' }}">
                      {{ service.isVisible ? 'ظاهرة' : 'مخفية' }}
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
          <button class="text-link back" type="button" (click)="closeService()">→ رجوع للخدمات</button>
          <h2>{{ selected.nameAr }}</h2>
          <p>{{ selected.nameEn }} · {{ selected.subServices.length }} خدمة فرعية</p>
        </div>
        <button class="btn primary" type="button" (click)="openAddSub()">+ إضافة خدمة فرعية</button>
      </div>

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
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="selected.sortOrder" />
        </div>
        <div class="field full">
          <label>صورة الخدمة</label>
          <div class="ops-service-image">
            @if (selected.imageUrl) {
              <img class="ops-service-preview" [src]="selected.imageUrl" alt="" />
            }
            <input type="file" accept="image/jpeg,image/png,image/webp" (change)="onSelectedImage($event)" />
            @if (selected.imageUrl) {
              <button class="btn ghost" type="button" (click)="clearSelectedImage()">حذف الصورة</button>
            }
          </div>
        </div>
      </div>
      <div class="ops-drawer-actions" style="margin:0 0 22px">
        <button class="btn primary" type="button" (click)="saveService(selected)">حفظ الخدمة</button>
        <button class="btn ghost" type="button" (click)="toggleService(selected)">
          {{ selected.isVisible ? 'إخفاء' : 'إظهار' }}
        </button>
      </div>

      <div class="section-head">
        <div>
          <h2>الخدمات الفرعية</h2>
          <p>اضغطي على صف لتعديل الخدمة الفرعية</p>
        </div>
      </div>
      @if (!selected.subServices.length) {
        <p class="page-empty">لا توجد خدمات فرعية بعد.</p>
      } @else {
        <div class="ops-table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الاسم الإنجليزي</th>
                <th>الترتيب</th>
                <th>الظهور</th>
              </tr>
            </thead>
            <tbody>
              @for (sub of selected.subServices; track sub.id) {
                <tr [class.active]="selectedSub?.id === sub.id" (click)="selectedSub = sub">
                  <td><b>{{ sub.nameAr }}</b></td>
                  <td>{{ sub.nameEn }}</td>
                  <td>{{ sub.sortOrder }}</td>
                  <td>
                    <span class="status {{ sub.isVisible ? 'success' : 'error' }}">
                      {{ sub.isVisible ? 'ظاهرة' : 'مخفية' }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <app-ops-modal [open]="addingSub" title="إضافة خدمة فرعية" [kicker]="selected?.nameAr || ''" (closed)="addingSub = false">
      <div class="form-grid">
        <div class="field">
          <label>الاسم *</label>
          <input class="input" [(ngModel)]="subDraft.nameAr" placeholder="قص شعر" />
        </div>
        <div class="field">
          <label>الاسم الإنجليزي *</label>
          <input class="input" [(ngModel)]="subDraft.nameEn" placeholder="Haircut" />
        </div>
        <div class="field">
          <label>الترتيب</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="subDraft.sortOrder" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:16px;width:100%" type="button" (click)="createSub()">إضافة الخدمة الفرعية</button>
    </app-ops-modal>

    <app-ops-drawer
      [open]="!!selectedSub"
      [title]="selectedSub?.nameAr || ''"
      kicker="خدمة فرعية"
      (closed)="selectedSub = null"
    >
      @if (selectedSub; as sub) {
        <div class="form-grid">
          <div class="field">
            <label>الاسم *</label>
            <input class="input" [(ngModel)]="sub.nameAr" />
          </div>
          <div class="field">
            <label>الاسم الإنجليزي *</label>
            <input class="input" [(ngModel)]="sub.nameEn" />
          </div>
          <div class="field">
            <label>الترتيب</label>
            <input class="input" inputmode="numeric" positiveInt [(ngModel)]="sub.sortOrder" />
          </div>
        </div>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveSub(sub)">حفظ</button>
          <button class="btn ghost" type="button" (click)="toggleSub(sub)">
            {{ sub.isVisible ? 'إخفاء' : 'إظهار' }}
          </button>
        </div>
      }
    </app-ops-drawer>
  `,
})
export class OpsCatalogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

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
    this.shell.set('الخدمات', 'الخدمات الرئيسية والفرعية الظاهرة في المنصة');
    this.load();
  }

  openService(service: OpsCatalogService): void {
    this.selected = service;
    this.selectedSub = null;
    this.shell.set(service.nameAr, service.nameEn || 'الخدمات الفرعية');
  }

  closeService(): void {
    this.selected = null;
    this.selectedSub = null;
    this.shell.set('الخدمات', 'الخدمات الرئيسية والفرعية الظاهرة في المنصة');
  }

  openAdd(): void {
    this.serviceDraft = emptyServiceDraft();
    this.resetDraftImage();
    this.adding = true;
  }

  closeAdd(): void {
    this.adding = false;
    this.resetDraftImage();
  }

  createService(): void {
    if (!this.hasNames(this.serviceDraft.nameAr, this.serviceDraft.nameEn)) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
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
            this.finishCreate('تمت إضافة الخدمة');
            return;
          }
          this.api.opsUploadServiceImage(row.id, file).subscribe({
            next: () => this.finishCreate('تمت إضافة الخدمة مع الصورة'),
            error: (err) => {
              this.toast.show(apiMessage(err, 'تمت إضافة الخدمة وتعذر رفع الصورة'));
              this.finishCreate();
            },
          });
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الخدمة')),
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
        this.toast.show('تم رفع صورة الخدمة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر رفع الصورة')),
    });
  }

  clearSelectedImage(): void {
    if (!this.selected) {
      return;
    }
    this.api.opsClearServiceImage(this.selected.id).subscribe({
      next: (row) => {
        this.applyService(row);
        this.toast.show('تم حذف صورة الخدمة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حذف الصورة')),
    });
  }

  saveService(service: OpsCatalogService): void {
    if (!this.hasNames(service.nameAr, service.nameEn)) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
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
          this.shell.set(service.nameAr, service.nameEn || 'الخدمات الفرعية');
          this.toast.show('تم حفظ الخدمة');
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر حفظ الخدمة')),
      });
  }

  toggleService(service: OpsCatalogService): void {
    this.api.opsPatchService(service.id, { isVisible: !service.isVisible }).subscribe({
      next: (row) => {
        service.isVisible = row.isVisible;
        this.toast.show(row.isVisible ? 'الخدمة ظاهرة' : 'تم إخفاء الخدمة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الظهور')),
    });
  }

  openAddSub(): void {
    this.subDraft = emptySubDraft();
    this.addingSub = true;
  }

  createSub(): void {
    if (!this.selected) {
      return;
    }
    if (!this.hasNames(this.subDraft.nameAr, this.subDraft.nameEn)) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
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
          this.toast.show('تمت إضافة الخدمة الفرعية');
          this.subDraft = emptySubDraft();
          this.addingSub = false;
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الخدمة الفرعية')),
      });
  }

  saveSub(sub: OpsSubService): void {
    if (!this.hasNames(sub.nameAr, sub.nameEn)) {
      this.toast.show('الاسم والاسم الإنجليزي مطلوبان');
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
          this.toast.show('تم حفظ الخدمة الفرعية');
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر الحفظ')),
      });
  }

  toggleSub(sub: OpsSubService): void {
    this.api.opsPatchSubService(sub.id, { isVisible: !sub.isVisible }).subscribe({
      next: (row) => {
        sub.isVisible = row.isVisible;
        this.toast.show(row.isVisible ? 'الخدمة الفرعية ظاهرة' : 'تم إخفاء الخدمة الفرعية');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الظهور')),
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
      this.toast.show('الصورة لازم تكون JPG أو PNG');
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
          this.shell.set(this.selected.nameAr, this.selected.nameEn || 'الخدمات الفرعية');
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الخدمات'));
      },
    });
  }
}
