import { Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-provider-dashboard',
  imports: [RouterLink, IconComponent],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">{{ locale.t('p.hero.eyebrow') }}</span>
        <h2>{{ locale.t('p.hero.hello') }}{{ name }}</h2>
        <p>{{ locale.t('p.hero.text') }}</p>
        <div class="hero-actions">
          <a class="btn primary" routerLink="/p/account">{{ locale.t('p.hero.profile') }} <app-icon name="edit" /></a>
          <a class="btn ghost" routerLink="/p/package">{{ locale.t('p.hero.package') }}</a>
        </div>
      </div>
      <img class="hero-art" src="/hero.png" alt="" />
    </section>
    <div class="section-head">
      <div>
        <h2>{{ locale.t('p.overview.title') }}</h2>
        <p>{{ locale.t('p.overview.sub') }}</p>
      </div>
    </div>
    <div class="grid four">
      @for (metric of metrics; track metric.label) {
        <article class="card metric">
          <div>
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <span class="trend">{{ metric.trend }}</span>
          </div>
          <div class="metric-icon"><app-icon [name]="metric.icon" /></div>
        </article>
      }
    </div>
    <div class="section-head">
      <div>
        <h2>{{ locale.t('p.manage.title') }}</h2>
        <p>{{ locale.t('p.manage.sub') }}</p>
      </div>
    </div>
    <div class="grid three">
      <article class="card hover">
        <div class="metric-icon"><app-icon name="user" /></div>
        <h3>{{ locale.t('p.card.profile') }}</h3>
        <p style="color:var(--muted);font-size:10px">{{ locale.t('p.card.profileText') }}</p>
        <a class="btn ghost" routerLink="/p/account">{{ locale.t('p.hero.profile') }}</a>
      </article>
      <article class="card hover">
        <div class="metric-icon"><app-icon name="spark" /></div>
        <h3>{{ locale.t('p.card.services') }}</h3>
        <p style="color:var(--muted);font-size:10px">{{ locale.t('p.card.servicesText') }}</p>
        <a class="btn ghost" routerLink="/p/services">{{ locale.t('p.card.servicesBtn') }}</a>
      </article>
      <article class="card hover">
        <div class="metric-icon"><app-icon name="image" /></div>
        <h3>{{ locale.t('p.card.portfolio') }}</h3>
        <p style="color:var(--muted);font-size:10px">{{ locale.t('p.card.portfolioText') }}</p>
        <a class="btn ghost" routerLink="/p/portfolio">{{ locale.t('p.card.portfolioBtn') }}</a>
      </article>
    </div>
  `,
})
export class ProviderDashboardComponent {
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);

  constructor() {
    effect(() => {
      this.locale.lang();
      this.shell.set(this.locale.t('p.dash.title'), this.locale.t('p.dash.subtitle'));
    });
  }

  get metrics() {
    return [
      { icon: 'eye', label: this.locale.t('p.metric.views'), value: '—', trend: this.locale.t('p.metric.viewsTrend') },
      { icon: 'star', label: this.locale.t('p.metric.rating'), value: '—', trend: this.locale.t('p.metric.ratingTrend') },
      { icon: 'image', label: this.locale.t('p.metric.photos'), value: '—', trend: this.locale.t('p.metric.photosTrend') },
      { icon: 'spark', label: this.locale.t('p.metric.services'), value: '—', trend: this.locale.t('p.metric.servicesTrend') },
    ];
  }

  get name(): string {
    return this.session.user()?.displayName || this.locale.t('p.nameFallback');
  }
}
