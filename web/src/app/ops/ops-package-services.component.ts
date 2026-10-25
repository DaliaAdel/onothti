import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import { servicePhoto, type CatalogPackage, type CatalogService } from '../core/models';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { PositiveIntDirective } from './positive-int.directive';

@Component({
  selector: 'app-ops-package-services',
  imports: [FormsModule, RouterLink, PositiveIntDirective],
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
          <p>{{ pkg.durationMonths }} شهر</p>
        </div>
        <div class="ops-drawer-actions" style="margin:0">
          @if (canSavePackage) {
            <button class="btn primary" type="button" [disabled]="saving" (click)="save()">حفظ الباقة</button>
          }
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
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.durationMonths" />
        </div>
        <div class="field">
          <label>السعر قبل الخصم</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.priceBefore" />
        </div>
        <div class="field">
          <label>الخصم %</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.discountPercent" />
        </div>
        <div class="field">
          <label>السعر بعد الخصم</label>
          <input class="input" [value]="afterOf(pkg.priceBefore, pkg.discountPercent)" readonly />
        </div>
        <div class="field">
          <label>ترتيب الظهور</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.rank" />
        </div>
        <div class="field">
          <label>عدد الخدمات</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.maxServices" />
        </div>
        <div class="field">
          <label>عدد الصور</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.maxPhotos" />
        </div>
        <div class="field">
          <label>عدد الفيديو</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.maxVideos" />
        </div>
        <div class="field">
          <label>عدد الألبومات</label>
          <input class="input" inputmode="numeric" positiveInt [(ngModel)]="pkg.maxAlbums" />
        </div>
      </div>

      <div class="section-head">
        <div>
          <h2>خدمات الباقة</h2>
          <p>عدددي الخدمات الرئيسية المتاحة لخبيرات هذه الباقة</p>
        </div>
      </div>
      <div class="pkg-services-page">
        <div class="pkg-services-box">
          <div class="pkg-services-toolbar">
            <span><b>{{ pickedCount() }}</b> من {{ services.length }} خدمة</span>
            <div class="pkg-services-links">
              <button class="text-link" type="button" (click)="setAll(true)">تعدديد الكل</button>
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
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  get canSavePackage(): boolean {
    return this.session.hasAnyPermission('PKG-04', 'PKG-05');
  }

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
        this.shell.set(this.pkg.nameAr, `${this.pkg.durationMonths} شهر`);
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
    const durationMonths = Number(this.pkg.durationMonths);
    const priceBefore = Number(this.pkg.priceBefore ?? this.pkg.price);
    const rank = Number(this.pkg.rank);
    if (!durationMonths || durationMonths <= 0 || !priceBefore || priceBefore <= 0 || !rank || rank <= 0) {
      this.toast.show('المدة والسعر والترتيب أرقام أكبر من صفر');
      return;
    }
    this.saving = true;
    const serviceIds = this.services.filter((service) => this.pick[service.id]).map((service) => service.id);
    this.api
      .opsPatchPackage(this.pkg.id, {
        nameAr: this.pkg.nameAr,
        durationMonths,
        priceBefore,
        discountPercent: Number(this.pkg.discountPercent) || 0,
        rank,
        maxServices: this.numOrNull(this.pkg.maxServices),
        maxPhotos: this.numOrNull(this.pkg.maxPhotos),
        maxVideos: this.numOrNull(this.pkg.maxVideos),
        maxAlbums: this.numOrNull(this.pkg.maxAlbums),
        serviceIds,
      })
      .subscribe({
        next: (row) => {
          this.pkg = row;
          this.shell.set(row.nameAr, `${row.durationMonths} شهر`);
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
