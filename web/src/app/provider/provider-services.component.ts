import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { apiMessage } from '../core/phone';
import type { CatalogService, ProviderServiceRow } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-provider-services',
  imports: [FormsModule],
  template: `
    <form class="card form-card" (ngSubmit)="add()">
      <div class="form-grid">
        <div class="field">
          <label>الخدمة</label>
          <select class="input" name="serviceId" [(ngModel)]="serviceId">
            <option value="">اختاري الخدمة</option>
            @for (service of catalog; track service.id) {
              <option [value]="service.id">{{ locale.localizedName(service) }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>الخدمة الفرعية</label>
          <select class="input" name="subServiceId" [(ngModel)]="subServiceId">
            <option value="">بدون تحديد</option>
            @for (sub of subServices; track sub.id) {
              <option [value]="sub.id">{{ locale.localizedName(sub) }}</option>
            }
          </select>
        </div>
      </div>
      <button class="btn primary" style="margin-top:18px" type="submit" [disabled]="loading">إضافة الخدمة</button>
    </form>
    @if (items.length === 0) {
      <p class="page-empty">لا توجد خدمات مضافة بعد.</p>
    } @else {
      <div class="grid two" style="margin-top:18px">
        @for (item of items; track item.id) {
          <article class="card hover provider">
            <div class="provider-photo">{{ locale.localizedName(item.service).slice(0, 1) }}</div>
            <div>
              <h3>{{ locale.localizedName(item.service) }}</h3>
              <p>{{ item.subService ? locale.localizedName(item.subService) : 'خدمة أساسية' }}</p>
            </div>
            <button class="btn ghost" type="button" (click)="remove(item.id)">حذف</button>
          </article>
        }
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
  serviceId = '';
  subServiceId = '';
  loading = false;

  get subServices() {
    return this.catalog.find((item) => item.id === this.serviceId)?.subServices ?? [];
  }

  ngOnInit(): void {
    this.shell.set('خدماتي', 'إدارة الخدمات الظاهرة للباحثات');
    this.api.services().subscribe({ next: (services) => (this.catalog = services) });
    this.reload();
  }

  add(): void {
    if (!this.serviceId) {
      this.toast.show('اختاري الخدمة أولًا');
      return;
    }
    this.loading = true;
    this.api
      .addProviderService({
        serviceId: this.serviceId,
        subServiceId: this.subServiceId || undefined,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.serviceId = '';
          this.subServiceId = '';
          this.toast.show('تمت إضافة الخدمة');
          this.reload();
        },
        error: (err) => {
          this.loading = false;
          this.toast.show(apiMessage(err, 'تعذر إضافة الخدمة'));
        },
      });
  }

  remove(id: string): void {
    this.api.removeProviderService(id).subscribe({
      next: () => {
        this.toast.show('تم حذف الخدمة');
        this.reload();
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر حذف الخدمة')),
    });
  }

  private reload(): void {
    this.api.providerServices().subscribe({ next: (items) => (this.items = items) });
  }
}
