import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { mediaUrl } from '../core/media';
import { apiMessage } from '../core/phone';
import type { ProviderProfile } from '../core/models';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { InitialsPipe } from '../core/name-initials';
import { FavoriteBtnComponent } from '../shared/favorite-btn.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-profile',
  imports: [FormsModule, FavoriteBtnComponent, IconComponent, InitialsPipe],
  template: `
    @if (loading) {
      <p class="loading">{{ locale.t('c.profile.loading') }}</p>
    } @else if (!profile) {
      <p class="page-empty">{{ error || locale.t('c.profile.hidden') }}</p>
    } @else {
      <div class="profile-cover"></div>
      <div class="profile-head">
        <div class="profile-photo">{{ profile.displayName | initials }}</div>
        <div>
          <h2>{{ profile.displayName }}</h2>
          <span class="badge">★ {{ profile.ratingAvg ?? '—' }}@if (profile.ratingCount) { · {{ profile.ratingCount }} {{ locale.t('c.ratingsCount') }} }</span>
          <p style="color:var(--muted);font-size:10px;margin:8px 0 0">
            {{ serviceLine }} · {{ locale.localizedName(profile.city, locale.t('c.country')) }}
          </p>
        </div>
        <div class="profile-actions">
          <app-favorite-btn targetType="PROVIDER" [targetId]="profile.id" />
          <button class="btn primary" type="button" (click)="openWhatsApp()" [disabled]="!profile.canContact">
            {{ locale.t('c.profile.whatsapp') }}
          </button>
        </div>
      </div>
      <nav class="tabs">
        @for (tab of tabs; track tab.id) {
          <button type="button" [class.active]="activeTab === tab.id" (click)="activeTab = tab.id">{{ locale.t(tab.label) }}</button>
        }
      </nav>
      <div class="grid three" style="margin-top:22px">
        <div class="card metric">
          <div>
            <span>{{ locale.t('c.profile.avg') }}</span>
            <strong>{{ profile.ratingAvg ?? '—' }}</strong>
          </div>
          <div class="metric-icon"><app-icon name="star" /></div>
        </div>
        <div class="card metric">
          <div>
            <span>{{ locale.t('c.profile.approvedRatings') }}</span>
            <strong>{{ profile.ratingCount ?? 0 }}</strong>
          </div>
          <div class="metric-icon"><app-icon name="check" /></div>
        </div>
        <div class="card metric">
          <div>
            <span>{{ locale.t('c.profile.works') }}</span>
            <strong>{{ profile.portfolio?.length ?? 0 }}</strong>
          </div>
          <div class="metric-icon"><app-icon name="image" /></div>
        </div>
      </div>
      @if (activeTab === 'about') {
        <div class="grid two" style="margin-top:17px">
          <article class="card">
            <h3 style="color:var(--plum)">{{ locale.t('c.profile.aboutMe') }}</h3>
            <p style="color:var(--muted);font-size:11px;line-height:2">{{ profile.bio || locale.t('c.profile.noBio') }}</p>
          </article>
          <article class="card">
            <h3 style="color:var(--plum)">{{ locale.t('c.profile.myServices') }}</h3>
            <div class="filters">
              @for (service of profile.services; track service.nameAr) {
                <span class="chip">{{ locale.localizedName(service) }}</span>
              }
            </div>
          </article>
        </div>
      }
      @if (activeTab === 'services') {
        <div class="filters" style="margin-top:18px">
          @for (service of profile.services; track service.nameAr) {
            <span class="chip active">{{ locale.localizedName(service) }}</span>
          }
        </div>
      }
      @if (activeTab === 'portfolio') {
        @if (!profile.portfolio?.length) {
          <p class="page-empty">{{ locale.t('c.profile.noWorks') }}</p>
        } @else {
          <div class="portfolio-grid">
            @for (item of profile.portfolio; track item.id) {
              <div class="portfolio-item">
                @if (item.url && item.kind !== 'VIDEO') {
                  <img [src]="mediaUrl(item.url)" alt="" loading="lazy" decoding="async" />
                } @else {
                  {{ item.kind === 'VIDEO' ? locale.t('c.profile.video') : locale.t('c.profile.work') }}
                }
              </div>
            }
          </div>
        }
      }
      @if (activeTab === 'ratings') {
        <article class="card" style="margin-top:18px">
          <h3 style="color:var(--plum)">{{ locale.t('c.profile.addRating') }}</h3>
          <div class="rating-stars">
            @for (star of [1, 2, 3, 4, 5]; track star) {
              <button type="button" [class.active]="stars >= star" (click)="stars = star">★</button>
            }
          </div>
          <textarea class="input" style="margin-top:12px" [(ngModel)]="note" name="note" [maxlength]="noteMax" [placeholder]="locale.t('c.profile.notePh')"></textarea>
          <small class="muted">{{ note.length }} / {{ noteMax }}</small>
          <button class="btn primary" style="margin-top:12px" type="button" [disabled]="ratingBusy || stars < 1" (click)="submitRating()">{{ locale.t('c.profile.sendRating') }}</button>
        </article>
        @if (!profile.ratings?.length) {
          <p class="page-empty">{{ locale.t('c.profile.noRatings') }}</p>
        } @else {
          <div class="grid two" style="margin-top:18px">
            @for (rating of profile.ratings; track $index) {
              <article class="card">
                <div class="rating">★ {{ rating.stars }}</div>
                <p style="color:var(--muted);font-size:11px;line-height:1.9">{{ rating.note || locale.t('c.profile.noComment') }}</p>
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
  readonly locale = inject(LocaleService);

  profile: ProviderProfile | null = null;
  loading = true;
  error = '';
  activeTab: 'about' | 'services' | 'portfolio' | 'ratings' = 'about';
  readonly tabs = [
    { id: 'about' as const, label: 'c.profile.tab.about' },
    { id: 'services' as const, label: 'c.profile.tab.services' },
    { id: 'portfolio' as const, label: 'c.profile.tab.portfolio' },
    { id: 'ratings' as const, label: 'c.profile.tab.ratings' },
  ];
  readonly mediaUrl = mediaUrl;
  stars = 5;
  note = '';
  noteMax = 300;
  ratingBusy = false;

  get serviceLine(): string {
    return this.locale.localizedName(this.profile?.services?.[0], this.locale.t('c.beauty'));
  }

  ngOnInit(): void {
    this.shell.set('c.expert.title', 'c.expert.sub');
    this.api.platformSettings().subscribe({
      next: (settings) => {
        this.noteMax = settings.ratingNoteMax || 300;
      },
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      this.error = this.locale.t('c.profile.missing');
      return;
    }
    this.api.provider(id).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.shell.set(profile.displayName, this.locale.localizedName(profile.city, this.locale.t('c.expert.title')));
        this.loading = false;
      },
      error: (err) => {
        this.error = apiMessage(err, this.locale.t('c.profile.hidden'));
        this.loading = false;
      },
    });
  }

  submitRating(): void {
    if (!this.profile || this.stars < 1) {
      return;
    }
    if (this.note.length > this.noteMax) {
      this.toast.show(this.locale.tf('c.profile.noteMax', { n: this.noteMax }));
      return;
    }
    this.ratingBusy = true;
    this.api.rate(this.profile.id, this.stars, this.note.trim() || undefined).subscribe({
      next: () => {
        this.ratingBusy = false;
        this.note = '';
        this.toast.show(this.locale.t('c.profile.ratingSent'));
      },
      error: (err) => {
        this.ratingBusy = false;
        this.toast.show(apiMessage(err, this.locale.t('c.profile.ratingFail')));
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
      error: (err) => this.toast.show(apiMessage(err, this.locale.t('c.profile.contactFail'))),
    });
  }
}
