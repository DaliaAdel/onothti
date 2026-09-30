import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { isLiveSubscription, type ProviderReviews } from '../core/models';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-reviews',
  imports: [RouterLink],
  template: `
    @if (locked) {
      <div class="page-head"><div><h1>الميزة غير متاحة</h1><p>يجب تفعيل الاشتراك أولًا</p></div></div>
      <div class="card subscription-lock">
        <div class="symbol">♢</div>
        <h2>اشتركي لتفعيل أدوات الخبيرة</h2>
        <p class="muted">بعد اختيار الباقة واعتماد الدفع يمكنكِ إضافة الخدمات ورفع الألبومات واستخدام الإحصاءات والتقييمات.</p>
        <a class="btn primary" routerLink="/p/package">عرض الباقات</a>
      </div>
    } @else {
      <div class="page-head">
        <div>
          <h1>التقييمات المعتمدة</h1>
          <p>التقييمات المنشورة على ملفك</p>
        </div>
      </div>
      <div class="grid wide-side">
        <div class="card list">
          @if (!data?.items?.length) {
            <p class="muted small">لا توجد تقييمات بعد.</p>
          } @else {
            @for (item of data!.items; track item.id) {
              <div class="list-row">
                <div class="avatar">★</div>
                <div class="copy">
                  <b>{{ item.stars }} نجوم</b>
                  <p>{{ item.note || 'بدون تعليق' }}</p>
                </div>
                <span class="stars">{{ '★'.repeat(item.stars) }}</span>
              </div>
            }
          }
        </div>
        <div class="card empty">
          <div class="value" style="font-size:42px;font-weight:900;color:var(--primary)">{{ data?.ratingAvg ?? '—' }}</div>
          <div class="stars">★★★★★</div>
          <p class="small muted">من {{ data?.ratingCount ?? 0 }} تقييمًا معتمدًا</p>
        </div>
      </div>
    }
  `,
})
export class ProviderReviewsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  data: ProviderReviews | null = null;
  locked = false;

  ngOnInit(): void {
    this.shell.set('التقييمات');
    this.api.providerSubscription().subscribe({
      next: (sub) => (this.locked = !isLiveSubscription(sub.current)),
    });
    this.api.providerReviews().subscribe({ next: (data) => (this.data = data) });
  }
}
