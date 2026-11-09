import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AccountType } from '../core/models';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';

@Component({
  selector: 'app-platform-about',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ locale.t('about.title') }}</h1>
        <p>{{ subtitle }}</p>
      </div>
    </div>
    <article class="card about-hero">
      <img src="/assets/logo.png" [attr.alt]="locale.t('brand.alt')" />
      <h2>{{ locale.t('about.brand') }}</h2>
      <p class="muted">{{ intro }}</p>
      <span class="status success">{{ locale.t('about.version') }}</span>
    </article>
    <div class="grid two about-points">
      @for (card of cards; track card.title) {
        <article class="card">
          <h3>{{ card.title }}</h3>
          <p class="muted small">{{ card.text }}</p>
        </article>
      }
    </div>
    <div class="card about-legal">
      <h3>{{ locale.t('about.legal') }}</h3>
      <p class="muted small">{{ helpText }}</p>
      <div class="hero-actions about-actions">
        <a class="btn ghost" routerLink="/legal/policies" [queryParams]="{ audience: audience }">{{ locale.t('about.privacy') }}</a>
        <a class="btn ghost" routerLink="/legal/terms" [queryParams]="{ audience: audience }">{{ locale.t('about.terms') }}</a>
        <a class="btn primary" [routerLink]="helpRoute">{{ helpLabel }}</a>
      </div>
      <p class="muted small about-mail">{{ locale.t('about.contact') }} <b dir="ltr">info&#64;onothti.com</b></p>
    </div>
  `,
})
export class PlatformAboutComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);

  ngOnInit(): void {
    this.shell.set('about.title', 'about.brand');
  }

  get audience(): AccountType {
    const type = this.session.user()?.accountType;
    return type === 'PROVIDER' || type === 'STAFF' ? type : 'CUSTOMER';
  }

  get subtitle(): string {
    return this.locale.t(`about.sub.${this.audienceKey}`);
  }

  get intro(): string {
    return this.locale.t(`about.intro.${this.audienceKey}`);
  }

  get cards(): { title: string; text: string }[] {
    const key = this.audienceKey;
    return [1, 2, 3, 4].map((n) => ({
      title: this.locale.t(`about.c${n}.${key}`),
      text: this.locale.t(`about.c${n}t.${key}`),
    }));
  }

  get helpText(): string {
    return this.locale.t(`about.help.${this.audienceKey}`);
  }

  get helpRoute(): string {
    if (this.audience === 'PROVIDER') {
      return '/p/support';
    }
    if (this.audience === 'STAFF') {
      return '/ops';
    }
    return '/c/requests';
  }

  get helpLabel(): string {
    return this.locale.t(`about.helpBtn.${this.audienceKey}`);
  }

  private get audienceKey(): 'customer' | 'provider' | 'staff' {
    if (this.audience === 'PROVIDER') {
      return 'provider';
    }
    if (this.audience === 'STAFF') {
      return 'staff';
    }
    return 'customer';
  }
}
