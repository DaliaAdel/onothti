import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import { servicePhoto, type CatalogPackage, type CatalogService } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-ops-package-services',
  imports: [FormsModule, RouterLink],
  template: `
    @if (loading) {
      <p class="loading">جاري التحميل...</p>
    } @else if (!pkg) {
      <p class="muted">الباقة غير موجودة</p>
    } @else {
      <div class="section-head">
        <div>
          <a class="text-link" routerLink="/ops/packages">→ رجوع للباقات</a>
          <h2>{{ pkg.nameAr }}</h2>
          <p>{{ pkg.code }} · {{ pkg.durationMonths }} شهر</p>
        </div>
        <div class="ops-drawer-actions" style="margin:0">
          <button class="btn primary" type="button" [disabled]="saving" (click)="save()">حفظ الباقة</button>
          <button class="btn ghost" type="button" [disabled]="saving" (click)="toggle()">
            {{ pkg.isActive ? 'إيقاف الظهور' : 'تفعيل الباقة' }}
          </button>
        </div>
      </div>

      <div class="form-grid" style="margin-bottom:22px">
        <div class="field">
          <label>الاسم</label>
          <input class="input" [(ngModel)]="pkg.nameAr" />
        </div>
        <div class="field">
          <label>المدة بالشهور</label>
          <input class="input" type="number" [(ngModel)]="pkg.durationMonths" />
        </div>
        <div class="field">
          <label>السعر قبل الخصم</label>
          <input class="input" type="number" min="0" step="0.01" [(ngModel)]="pkg.priceBefore" />
        </div>
        <div class="field">
          <label>الخصم %</label>
          <input class="input" type="number" min="0" max="100" step="0.01" [(ngModel)]="pkg.discountPercent" />
        </div>
        <div class="field">
          <label>السعر بعد الخصم</label>
          <input class="input" [value]="afterOf(pkg.priceBefore, pkg.discountPercent)" readonly />
        </div>
        <div class="field">
          <label>ترتيب الظهور</label>
          <input class="input" type="number" [(ngModel)]="pkg.rank" />
        </div>
        <div class="field">
          <label>حد الخدمات</label>
          <input class="input" type="number" [(ngModel)]="pkg.maxServices" />
        </div>
        <div class="field">
          <label>حد الصور</label>
          <input class="input" type="number" [(ngModel)]="pkg.maxPhotos" />
        </div>
        <div class="field">
          <label>حد الفيديو</label>
          <input class="input" type="number" [(ngModel)]="pkg.maxVideos" />
        </div>
        <div class="field">
          <label>حد الألبومات</label>
          <input class="input" type="number" [(ngModel)]="pkg.maxAlbums" />
        </div>
      </div>

      <div class="section-head">
        <div>
          <h2>خدمات الباقة</h2>
          <p>حددي الخدمات الرئيسية المتاحة لخبيرات هذه الباقة</p>
        </div>
      </div>
      <div class="pkg-services-page">
        <div class="pkg-services-box">
          <div class="pkg-services-toolbar">
            <span><b>{{ pickedCount() }}</b> من {{ services.length }} خدمة</span>
            <div class="pkg-services-links">
              <button class="text-link" type="button" (click)="setAll(true)">تحديد الكل</button>
              <button class="text-link" type="button" (click)="setAll(false)">مسح</button>
            </div>
          </div>
          <div class="pkg-services-grid">
            @for (service of services; track service.id) {
              <label class="pkg-service" [class.on]="pick[service.id]">
                <input type="checkbox" [name]="'svc-' + service.id" [(ngModel)]="pick[service.id]" />
                <img [src]="photoOf(service)" alt="" />
                <span>{{ service.nameAr }}</span>
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
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  pkg: CatalogPackage | null = null;
  services: CatalogService[] = [];
  pick: Record<string, boolean> = {};
  loading = true;
  saving = false;

  ngOnInit(): void {
    this.shell.set('الباقة', 'تعديل الباقة وخدماتها');
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    forkJoin({
      packages: this.api.opsPackages(),
      services: this.api.services(),
    }).subscribe({
      next: ({ packages, services }) => {
        this.services = services;
        this.pkg = packages.find((item) => item.id === id) ?? null;
        if (!this.pkg) {
          this.loading = false;
          this.toast.show('الباقة غير موجودة');
          void this.router.navigate(['/ops/packages']);
          return;
        }
        this.shell.set(this.pkg.nameAr, this.pkg.code);
        const selected = new Set(this.pkg.serviceIds ?? []);
        this.pick = {};
        for (const service of services) {
          this.pick[service.id] = selected.has(service.id);
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(apiMessage(err, 'تعذر تحميل الباقة'));
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
    this.saving = true;
    const serviceIds = this.services.filter((service) => this.pick[service.id]).map((service) => service.id);
    this.api
      .opsPatchPackage(this.pkg.id, {
        nameAr: this.pkg.nameAr,
        durationMonths: Number(this.pkg.durationMonths),
        priceBefore: Number(this.pkg.priceBefore ?? this.pkg.price),
        discountPercent: Number(this.pkg.discountPercent ?? 0),
        rank: Number(this.pkg.rank),
        maxServices: this.numOrNull(this.pkg.maxServices),
        maxPhotos: this.numOrNull(this.pkg.maxPhotos),
        maxVideos: this.numOrNull(this.pkg.maxVideos),
        maxAlbums: this.numOrNull(this.pkg.maxAlbums),
        serviceIds,
      })
      .subscribe({
        next: (row) => {
          this.pkg = row;
          this.shell.set(row.nameAr, row.code);
          this.saving = false;
          this.toast.show('تم حفظ الباقة');
        },
        error: (err) => {
          this.saving = false;
          this.toast.show(apiMessage(err, 'تعذر حفظ الباقة'));
        },
      });
  }

  toggle(): void {
    if (!this.pkg) {
      return;
    }
    this.api.opsPatchPackage(this.pkg.id, { isActive: !this.pkg.isActive }).subscribe({
      next: (row) => {
        if (this.pkg) {
          this.pkg.isActive = row.isActive;
        }
        this.toast.show(row.isActive ? 'الباقة ظاهرة للخبيرات' : 'تم إيقاف الباقة');
      },
      error: (err) => this.toast.show(apiMessage(err, 'تعذر تغيير الحالة')),
    });
  }

  private numOrNull(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  }
}
