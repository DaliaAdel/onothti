import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { apiMessage } from '../core/phone';
import type { ProviderProfile } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { FavoriteBtnComponent } from '../shared/favorite-btn.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-profile',
  imports: [FavoriteBtnComponent, IconComponent],
  template: `
    @if (loading) {
      <p class="loading">جاري تحميل الملف...</p>
    } @else if (!profile) {
      <p class="page-empty">{{ error || 'الملف غير ظاهر' }}</p>
    } @else {
      <div class="profile-cover"></div>
      <div class="profile-head">
        <div class="profile-photo">{{ profile.displayName.slice(0, 1) }}</div>
        <div>
          <h2>{{ profile.displayName }}</h2>
          <span class="badge">✓ {{ profile.badge || 'حساب نشط ومعتمد' }}</span>
          <p style="color:var(--muted);font-size:10px;margin:8px 0 0">
            {{ serviceLine }} · {{ profile.city?.nameAr || 'المملكة' }}
          </p>
        </div>
        <div class="profile-actions">
          <app-favorite-btn targetType="PROVIDER" [targetId]="profile.id" />
          <button class="btn primary" type="button" (click)="openWhatsApp()" [disabled]="!profile.canContact">
            تواصل عبر واتساب
          </button>
        </div>
      </div>
      <nav class="tabs">
        @for (tab of tabs; track tab.id) {
          <button type="button" [class.active]="activeTab === tab.id" (click)="activeTab = tab.id">{{ tab.label }}</button>
        }
      </nav>
      <div class="grid three" style="margin-top:22px">
        <div class="card metric">
          <div>
            <span>متوسط التقييم</span>
            <strong>{{ profile.ratingAvg ?? '—' }}</strong>
          </div>
          <div class="metric-icon"><app-icon name="star" /></div>
        </div>
        <div class="card metric">
          <div>
            <span>تقييمًا معتمدًا</span>
            <strong>{{ profile.ratingCount ?? 0 }}</strong>
          </div>
          <div class="metric-icon"><app-icon name="check" /></div>
        </div>
        <div class="card metric">
          <div>
            <span>عملًا في الألبوم</span>
            <strong>{{ profile.portfolio?.length ?? 0 }}</strong>
          </div>
          <div class="metric-icon"><app-icon name="image" /></div>
        </div>
      </div>
      @if (activeTab === 'about') {
        <div class="grid two" style="margin-top:17px">
          <article class="card">
            <h3 style="color:var(--plum)">نبذة عني</h3>
            <p style="color:var(--muted);font-size:11px;line-height:2">{{ profile.bio || 'لم تُضف نبذة بعد.' }}</p>
          </article>
          <article class="card">
            <h3 style="color:var(--plum)">خدماتي الاحترافية</h3>
            <div class="filters">
              @for (service of profile.services; track service.nameAr) {
                <span class="chip">{{ service.nameAr }}</span>
              }
            </div>
          </article>
        </div>
      }
      @if (activeTab === 'services') {
        <div class="filters" style="margin-top:18px">
          @for (service of profile.services; track service.nameAr) {
            <span class="chip active">{{ service.nameAr }}</span>
          }
        </div>
      }
      @if (activeTab === 'portfolio') {
        @if (!profile.portfolio?.length) {
          <p class="page-empty">لا توجد أعمال معتمدة بعد.</p>
        } @else {
          <div class="portfolio-grid">
            @for (item of profile.portfolio; track item.id) {
              <div class="portfolio-item">
                @if (item.url && item.kind !== 'VIDEO') {
                  <img [src]="mediaUrl(item.url)" alt="" />
                } @else {
                  {{ item.kind === 'VIDEO' ? 'فيديو' : 'عمل' }}
                }
              </div>
            }
          </div>
        }
      }
      @if (activeTab === 'ratings') {
        @if (!profile.ratings?.length) {
          <p class="page-empty">لا توجد تقييمات معتمدة بعد.</p>
        } @else {
          <div class="grid two" style="margin-top:18px">
            @for (rating of profile.ratings; track $index) {
              <article class="card">
                <div class="rating">★ {{ rating.stars }}</div>
                <p style="color:var(--muted);font-size:11px;line-height:1.9">{{ rating.note || 'بدون تعليق' }}</p>
              </article>
            }
          </div>
        }
      }
    }
  `,
})
export class ProviderProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly shell = inject(ShellService);
  private readonly toast = inject(ToastService);

  profile: ProviderProfile | null = null;
  loading = true;
  error = '';
  activeTab: 'about' | 'services' | 'portfolio' | 'ratings' = 'about';
  readonly tabs = [
    { id: 'about' as const, label: 'نبذة' },
    { id: 'services' as const, label: 'الخدمات' },
    { id: 'portfolio' as const, label: 'ألبومات الأعمال' },
    { id: 'ratings' as const, label: 'التقييمات' },
  ];
  readonly mediaUrl = mediaUrl;

  get serviceLine(): string {
    return this.profile?.services?.[0]?.nameAr || 'خدمات تجميل';
  }

  ngOnInit(): void {
    this.shell.set('ملف صانعة الجمال', 'تفاصيل موثقة تساعدكِ على الاختيار بثقة');
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      this.error = 'الملف غير موجود';
      return;
    }
    this.api.provider(id).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.shell.set(profile.displayName, profile.city?.nameAr || 'ملف صانعة الجمال');
        this.loading = false;
      },
      error: (err) => {
        this.error = apiMessage(err, 'الملف غير ظاهر');
        this.loading = false;
      },
    });
  }

  openWhatsApp(): void {
    if (!this.profile) {
      return;
    }
    this.api.whatsapp(this.profile.id).subscribe({
      next: (res) => {
        this.toast.show(res.disclaimerAr);
        window.open(res.url, '_blank', 'noopener');
      },
      error: (err) => this.toast.show(apiMessage(err, 'التواصل غير متاح لهذه الباقة')),
    });
  }
}
