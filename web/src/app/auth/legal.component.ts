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
        <a routerLink="/signup" class="back-link">→ العودة لإنشاء الحساب</a>
        <span class="eyebrow">{{ audience === 'PROVIDER' ? 'صانعة الجمال' : 'الباحثة' }}</span>
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

  kind: 'terms' | 'policies' = 'terms';
  audience: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER';
  title = 'الشروط والسياسات';
  body = '';
  loading = true;

  ngOnInit(): void {
    this.kind = this.route.snapshot.data['kind'] === 'policies' ? 'policies' : 'terms';
    const audience = this.route.snapshot.queryParamMap.get('audience');
    this.audience = audience === 'PROVIDER' ? 'PROVIDER' : 'CUSTOMER';
    this.title = this.kind === 'policies' ? 'سياسة الخصوصية' : 'شروط الاستخدام';
    const request = this.kind === 'policies' ? this.api.policies(this.audience) : this.api.terms(this.audience);
    request.subscribe({
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
