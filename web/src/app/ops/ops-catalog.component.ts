import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { OpsCatalogService, OpsSubService } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { OpsDrawerComponent } from './ops-drawer.component';
import { keepSelected } from './ops-ui';

@Component({
  selector: 'app-ops-catalog',
  imports: [FormsModule, OpsDrawerComponent],
  template: `
    <div class="section-head">
      <div>
        <h2>الخدمات والخدمات الفرعية</h2>
        <p>اضغطي على الخدمة لتعديلها وإدارة خدماتها الفرعية</p>
      </div>
    </div>

    <article class="card form-card" style="margin-bottom:22px">
      <h3 style="margin:0 0 12px;color:var(--plum)">إضافة خدمة رئيسية</h3>
      <div class="form-grid">
        <div class="field">
          <label>الرمز</label>
          <input class="input" [(ngModel)]="serviceDraft.code" placeholder="HAIR" />
        </div>
        <div class="field">
          <label>الاسم</label>
          <input class="input" [(ngModel)]="serviceDraft.nameAr" placeholder="الشعر" />
        </div>
        <div class="field">
          <label>الاسم الإنجليزي</label>
          <input class="input" [(ngModel)]="serviceDraft.nameEn" placeholder="Hair" />
        </div>
        <div class="field">
          <label>الترتيب</label>
          <input class="input" type="number" [(ngModel)]="serviceDraft.sortOrder" />
        </div>
      </div>
      <button class="btn primary" style="margin-top:14px" type="button" (click)="createService()">إضافة الخدمة</button>
    </article>

    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!services.length) {
      <p class="page-empty">لا توجد خدمات بعد.</p>
    } @else {
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>الخدمة</th>
              <th>الرمز</th>
              <th>فرعية</th>
              <th>الترتيب</th>
              <th>الظهور</th>
            </tr>
          </thead>
          <tbody>
            @for (service of services; track service.id) {
              <tr [class.active]="selected?.id === service.id" (click)="selected = service">
                <td><b>{{ service.nameAr }}</b></td>
                <td>{{ service.code }}</td>
                <td>{{ service.subServices.length }}</td>
                <td>{{ service.sortOrder }}</td>
                <td><span class="status {{ service.isVisible ? 'success' : 'error' }}">{{ service.isVisible ? 'ظاهرة' : 'مخفية' }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <app-ops-drawer
      [open]="!!selected"
      [title]="selected?.nameAr || ''"
      [kicker]="selected?.code || 'خدمة'"
      (closed)="selected = null"
    >
      @if (selected; as service) {
        <div class="form-grid">
          <div class="field">
            <label>الاسم</label>
            <input class="input" [(ngModel)]="service.nameAr" />
          </div>
          <div class="field">
            <label>الاسم الإنجليزي</label>
            <input class="input" [(ngModel)]="service.nameEn" />
          </div>
          <div class="field">
            <label>الترتيب</label>
            <input class="input" type="number" [(ngModel)]="service.sortOrder" />
          </div>
        </div>
        <div class="ops-drawer-actions">
          <button class="btn primary" type="button" (click)="saveService(service)">حفظ الخدمة</button>
          <button class="btn ghost" type="button" (click)="toggleService(service)">
            {{ service.isVisible ? 'إخفاء' : 'إظهار' }}
          </button>
        </div>
        <h4 style="margin:22px 0 8px;color:var(--plum)">خدمات فرعية ({{ service.subServices.length }})</h4>
        @for (sub of service.subServices; track sub.id) {
          <div style="border:1px solid var(--line);border-radius:14px;padding:12px;margin-bottom:10px">
            <div class="form-grid">
              <div class="field">
                <label>الاسم</label>
                <input class="input" [(ngModel)]="sub.nameAr" />
              </div>
              <div class="field">
                <label>الاسم الإنجليزي</label>
                <input class="input" [(ngModel)]="sub.nameEn" />
              </div>
            </div>
            <div class="ops-drawer-actions">
              <button class="btn primary" type="button" (click)="saveSub(sub)">حفظ</button>
              <button class="btn ghost" type="button" (click)="toggleSub(sub)">
                {{ sub.isVisible ? 'إخفاء' : 'إظهار' }}
              </button>
            </div>
          </div>
        }
        <div class="form-grid" style="margin-top:8px">
          <div class="field">
            <label>رمز الفرعية</label>
            <input class="input" [(ngModel)]="subDrafts[service.id].code" placeholder="HAIR-CUT" />
          </div>
          <div class="field">
            <label>اسم الفرعية</label>
            <input class="input" [(ngModel)]="subDrafts[service.id].nameAr" placeholder="قص شعر" />
          </div>
        </div>
        <button class="btn soft" style="margin-top:12px" type="button" (click)="createSub(service)">إضافة خدمة فرعية</button>
      }
    </app-ops-drawer>
  `,
})
export class OpsCatalogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  loading = true;
  services: OpsCatalogService[] = [];
  selected: OpsCatalogService | null = null;
  serviceDraft = { code: '', nameAr: '', nameEn: '', sortOrder: 0 };
  subDrafts: Record<string, { code: string; nameAr: string }> = {};

  ngOnInit(): void {
    this.shell.set('الخدمات', 'الخدمات الرئيسية والفرعية الظاهرة في المنصة');
    this.load();
  }

  createService(): void {
    if (!this.serviceDraft.code.trim() || this.serviceDraft.nameAr.trim().length < 2) {
      this.toast.show('أدخلي رمز الخدمة واسمها');
      return;
    }
    this.api
      .opsCreateService({
        code: this.serviceDraft.code,
        nameAr: this.serviceDraft.nameAr,
        nameEn: this.serviceDraft.nameEn || undefined,
        sortOrder: Number(this.serviceDraft.sortOrder) || 0,
        isVisible: true,
      })
      .subscribe({
        next: () => {
          this.toast.show('تمت إضافة الخدمة');
          this.serviceDraft = { code: '', nameAr: '', nameEn: '', sortOrder: 0 };
          this.load();
        },
        error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الخدمة')),
      });
  }

  saveService(service: OpsCatalogService): void {
    this.api
      .opsPatchService(service.id, {
        nameAr: service.nameAr,
        nameEn: service.nameEn,
        sortOrder: Number(service.sortOrder) || 0,
      })
      .subscribe({
        next: () => this.toast.show('تم حفظ الخدمة'),
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

  createSub(service: OpsCatalogService): void {
    const draft = this.subDrafts[service.id];
    if (!draft?.code.trim() || draft.nameAr.trim().length < 2) {
      this.toast.show('أدخلي رمز الخدمة الفرعية واسمها');
      return;
    }
    this.api.opsCreateSubService(service.id, { code: draft.code, nameAr: draft.nameAr }).subscribe({
      next: () => {
        this.toast.show('تمت إضافة الخدمة الفرعية');
        this.subDrafts[service.id] = { code: '', nameAr: '' };
        this.load();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر إضافة الخدمة الفرعية')),
    });
  }

  saveSub(sub: OpsSubService): void {
    this.api.opsPatchSubService(sub.id, { nameAr: sub.nameAr, nameEn: sub.nameEn }).subscribe({
      next: () => this.toast.show('تم حفظ الخدمة الفرعية'),
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

  private load(): void {
    this.loading = true;
    this.api.opsCatalog().subscribe({
      next: (services) => {
        this.services = services;
        this.selected = keepSelected(this.services, this.selected);
        for (const service of services) {
          this.subDrafts[service.id] ??= { code: '', nameAr: '' };
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
