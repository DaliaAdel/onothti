import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { LocaleService } from '../core/locale.service';
import { isLiveSubscription, type ProviderReviews } from '../core/models';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-provider-reviews',
  imports: [RouterLink],
  template: `
    @if (locked) {
      <div class="page-head"><div><h1>{{ locale.t('p.locked.title') }}</h1><p>{{ locale.t('p.locked.sub') }}</p></div></div>
      <div class="card subscription-lock">
        <div class="symbol">♢</div>
        <h2>{{ locale.t('p.locked.ctaTitle') }}</h2>
        <p class="muted">{{ locale.t('p.locked.ctaText') }}</p>
        <a class="btn primary" routerLink="/p/package">{{ locale.t('p.locked.viewPackages') }}</a>
      </div>
    } @else {
      <div class="page-head">
        <div>
          <h1>{{ locale.t('p.reviews.title') }}</h1>
          <p>{{ locale.t('p.reviews.sub') }}</p>
        </div>
      </div>
      <div class="grid wide-side">
        <div class="card list">
          @if (!data?.items?.length) {
            <p class="muted small">{{ locale.t('p.reviews.empty') }}</p>
          } @else {
            @for (item of data!.items; track item.id) {
              <div class="list-row">
                <div class="avatar">★</div>
                <div class="copy">
                  <b>{{ item.stars }} {{ locale.t('p.reviews.stars') }}</b>
                  <p>{{ item.note || locale.t('c.profile.noComment') }}</p>
                </div>
                <span class="stars">{{ '★'.repeat(item.stars) }}</span>
              </div>
            }
          }
        </div>
        <div class="card empty">
          <div class="value" style="font-size:42px;font-weight:900;color:var(--primary)">{{ data?.ratingAvg ?? '—' }}</div>
          <div class="stars">★★★★★</div>
          <p class="small muted">{{ locale.tf('p.reviews.from', { n: data?.ratingCount ?? 0 }) }}</p>
        </div>
      </div>
    }
  `,
})
export class ProviderReviewsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);
  data: ProviderReviews | null = null;
  locked = false;

  ngOnInit(): void {
    this.shell.set('nav.reviews');
    this.api.providerSubscription().subscribe({
      next: (sub) => (this.locked = !isLiveSubscription(sub.current)),
    });
    this.api.providerReviews().subscribe({ next: (data) => (this.data = data) });
  }
}
