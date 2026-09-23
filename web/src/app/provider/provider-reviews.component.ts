import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../core/api.service';
import type { ProviderReviews } from '../core/models';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-reviews',
  template: `
    <div class="grid three">
      <div class="card metric">
        <div>
          <span>متوسط التقييم</span>
          <strong>{{ data?.ratingAvg ?? '—' }}</strong>
        </div>
      </div>
      <div class="card metric">
        <div>
          <span>تقييمًا معتمدًا</span>
          <strong>{{ data?.ratingCount ?? 0 }}</strong>
        </div>
      </div>
    </div>
    @if (!data?.items?.length) {
      <p class="page-empty">لا توجد تقييمات بعد.</p>
    } @else {
      <div class="grid two" style="margin-top:18px">
        @for (item of data!.items; track item.id) {
          <article class="card">
            <div class="rating">★ {{ item.stars }} · {{ item.status }}</div>
            <p style="color:var(--muted);font-size:11px;line-height:1.9">{{ item.note || 'بدون تعليق' }}</p>
          </article>
        }
      </div>
    }
  `,
})
export class ProviderReviewsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  data: ProviderReviews | null = null;

  ngOnInit(): void {
    this.shell.set('تقييماتي', 'التقييمات المعتمدة على ملفك');
    this.api.providerReviews().subscribe({ next: (data) => (this.data = data) });
  }
}
