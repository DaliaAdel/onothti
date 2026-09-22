import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { apiMessage } from '../core/phone';
import type { CatalogCity } from '../core/models';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-signup-customer',
  imports: [FormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    <app-auth-layout
      variant="customer"
      visualIcon="search"
      visualTitle="كل خدمات الجمال أقرب إليكِ"
      visualSub="تصفحي الخدمات، قارني ملفات صانعات الجمال وتواصلي مع الأنسب لكِ."
      [visualFeatures]="['استكشاف الخدمات', 'حفظ المفضلة', 'التقييمات الموثوقة']"
    >
      <form class="auth-box signup-details" (ngSubmit)="submit()">
        <a routerLink="/signup/type" class="back-link">→ تغيير نوع الحساب</a>
        <span class="eyebrow">باحثة عن الأنوثة · 3 من 3</span>
        <h1>عرّفينا بكِ</h1>
        <p class="sub">بيانات بسيطة تساعدنا في تخصيص الخدمات والنتائج المناسبة لكِ.</p>
        <div class="form-grid">
          <div class="field">
            <label>الاسم</label>
            <input class="input" name="name" [(ngModel)]="displayName" required placeholder="الاسم الكامل" />
          </div>
          <div class="field">
            <label>اسم العرض</label>
            <input class="input" name="display" [(ngModel)]="displayName" required placeholder="الاسم الظاهر داخل المنصة" />
          </div>
          <div class="field full">
            <label>المدينة</label>
            <select class="input" name="city" [(ngModel)]="cityId">
              <option value="">اختاري المدينة</option>
              @for (city of cities; track city.id) {
                <option [value]="city.id">{{ city.nameAr }}</option>
              }
            </select>
          </div>
        </div>
        @if (error) {
          <p class="auth-error">{{ error }}</p>
        }
        <button class="btn primary full" style="margin-top:20px" type="submit" [disabled]="loading">
          إنشاء حساب الباحثة
          <app-icon name="arrow" />
        </button>
        <div class="auth-note">
          <b>✓</b>
          <span>يمكنكِ استخدام الحساب مباشرة بعد تأكيد رقم الجوال، بينما يخضع اسم العرض والصورة للمراجعة.</span>
        </div>
      </form>
    </app-auth-layout>
  `,
})
export class SignupCustomerComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  displayName = '';
  cityId = '';
  cities: CatalogCity[] = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    const draft = this.session.getDraft();
    if (!draft || draft.accountType !== 'CUSTOMER') {
      void this.router.navigateByUrl('/signup/type');
      return;
    }
    this.displayName = draft.displayName;
    this.api.cities().subscribe({
      next: (cities) => (this.cities = cities),
      error: () => {
        this.cities = [];
      },
    });
  }

  submit(): void {
    const draft = this.session.getDraft();
    if (!draft) {
      void this.router.navigateByUrl('/signup');
      return;
    }
    this.loading = true;
    this.error = '';
    this.session.saveDraft({ ...draft, displayName: this.displayName.trim(), cityId: this.cityId || undefined });
    this.api
      .register({
        accountType: 'CUSTOMER',
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
