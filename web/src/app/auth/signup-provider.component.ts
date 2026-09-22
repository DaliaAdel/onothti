import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { CatalogCity, CatalogService } from '../core/models';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-signup-provider',
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout
      variant="provider"
      visualIcon="spark"
      visualTitle="حوّلي موهبتكِ إلى حضور احترافي"
      visualSub="اعرضي خدماتك وأعمالك في ملف موثوق يصل إلى الباحثات في مدينتك."
      [visualFeatures]="['ملف احترافي', 'ألبومات أعمال', 'إحصاءات المشاهدات']"
    >
      <form class="auth-box signup-details" (ngSubmit)="submit()">
        <a routerLink="/signup/type" class="back-link">→ تغيير نوع الحساب</a>
        <span class="eyebrow">صانعة جمال · 3 من 3</span>
        <h1>ابدئي ملفكِ المهني</h1>
        <p class="sub">أضيفي بياناتك الأساسية الآن، ويمكنكِ استكمال الخدمات والألبومات بعد الدخول.</p>
        <div class="form-grid">
          <div class="field">
            <label>الاسم الكامل</label>
            <input class="input" name="name" [(ngModel)]="displayName" required placeholder="كما في الهوية" />
          </div>
          <div class="field">
            <label>اسم العرض</label>
            <input class="input" name="display" [(ngModel)]="displayName" required placeholder="الاسم المهني الظاهر" />
          </div>
          <div class="field">
            <label>المدينة</label>
            <select class="input" name="city" [(ngModel)]="cityId">
              <option value="">اختاري المدينة</option>
              @for (city of cities; track city.id) {
                <option [value]="city.id">{{ city.nameAr }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>الخدمة الأساسية</label>
            <select class="input" name="service" [(ngModel)]="serviceId">
              <option value="">اختاري الخدمة</option>
              @for (service of services; track service.id) {
                <option [value]="service.id">{{ service.nameAr }}</option>
              }
            </select>
          </div>
          <div class="field full">
            <label>نبذة مهنية مختصرة</label>
            <textarea class="input" name="bio" [(ngModel)]="bio" placeholder="اكتبي نبذة عن خبرتك وخدماتك"></textarea>
          </div>
        </div>
        @if (error) {
          <p class="auth-error">{{ error }}</p>
        }
        <button class="btn primary full" style="margin-top:20px" type="submit" [disabled]="loading">
          إنشاء حساب صانعة الجمال
          <app-icon name="arrow" />
        </button>
        <div class="auth-note">
          <b>!</b>
          <span>بعد إنشاء الحساب، ستظهر خطوات استكمال الملف واختيار الباقة وإرسال إثبات السداد للمراجعة.</span>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class SignupProviderComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  displayName = '';
  cityId = '';
  serviceId = '';
  bio = '';
  cities: CatalogCity[] = [];
  services: CatalogService[] = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    const draft = this.session.getDraft();
    if (!draft || draft.accountType !== 'PROVIDER') {
      void this.router.navigateByUrl('/signup/type');
      return;
    }
    this.displayName = draft.displayName;
    this.api.cities().subscribe({ next: (cities) => (this.cities = cities) });
    this.api.services().subscribe({ next: (services) => (this.services = services) });
  }

  submit(): void {
    const draft = this.session.getDraft();
    if (!draft) {
      void this.router.navigateByUrl('/signup');
      return;
    }
    this.loading = true;
    this.error = '';
    this.session.saveDraft({
      ...draft,
      displayName: this.displayName.trim(),
      cityId: this.cityId || undefined,
      bio: this.bio.trim() || undefined,
    });
    this.api
      .register({
        accountType: 'PROVIDER',
        displayName: this.displayName.trim(),
        mobile: draft.mobile,
        password: draft.password,
        email: draft.email,
      })
      .subscribe({
        next: () => {
          this.toast.show('تم إنشاء الحساب، أكّدي رقم الجوال');
          void this.router.navigate(['/otp'], { queryParams: { purpose: 'REGISTER' } });
        },
        error: (err) => {
          this.loading = false;
          this.error = apiMessage(err, 'تعذر إنشاء الحساب');
        },
      });
  }
}
