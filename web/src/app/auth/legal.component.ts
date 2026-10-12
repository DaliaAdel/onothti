import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthLayoutComponent } from '../shared/auth-layout.component';

@Component({
  selector: 'app-legal',
  imports: [RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <div class="auth-box signup-details">
        <a [routerLink]="backLink" class="back-link">→ العودة</a>
        <span class="eyebrow">{{ audienceLabel }}</span>
        <h1>{{ title }}</h1>
        @if (loading) {
          <p class="loading">جاري التحميل...</p>
        } @else {
          <p class="legal-body">{{ body }}</p>
        }
      </div>
    </app-auth-layout>
  `,
})
export class LegalComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  kind: 'TERMS' | 'POLICIES' | 'PRIVACY' | 'OTHER' = 'TERMS';
  audience: 'CUSTOMER' | 'PROVIDER' | 'STAFF' = 'CUSTOMER';
  title = 'الشروط والسياسات';
  body = '';
  loading = true;

  get audienceLabel(): string {
    if (this.audience === 'PROVIDER') {
      return 'الخبيرة';
    }
    if (this.audience === 'STAFF') {
      return 'موظفو المنصة';
    }
    return 'العميلة';
  }

  get backLink(): string {
    return this.audience === 'STAFF' ? '/ops/about' : '/signup';
  }

  ngOnInit(): void {
    const dataKind = String(this.route.snapshot.data['kind'] || 'terms');
    this.kind =
      dataKind === 'policies'
        ? 'POLICIES'
        : dataKind === 'privacy'
          ? 'PRIVACY'
          : dataKind === 'other'
            ? 'OTHER'
            : 'TERMS';
    const audience = this.route.snapshot.queryParamMap.get('audience');
    this.audience = audience === 'PROVIDER' || audience === 'STAFF' ? audience : 'CUSTOMER';
    this.title =
      this.kind === 'POLICIES'
        ? 'السياسات'
        : this.kind === 'PRIVACY'
          ? 'سياسة الخصوصية'
          : this.kind === 'OTHER'
            ? 'صفحة قانونية'
            : 'شروط الاستخدام';
    this.api.legalPage(this.kind, this.audience).subscribe({
      next: (page) => {
        this.title = page.titleAr || this.title;
        this.body = page.bodyAr || page.contentAr || 'المحتوى غير متاح حاليًا.';
        this.loading = false;
      },
      error: () => {
        this.body = 'تعذر تحميل الصفحة الآن.';
        this.loading = false;
      },
    });
  }
}
