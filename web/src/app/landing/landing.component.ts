import { Component, HostListener, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../core/locale.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  styleUrl: './landing.css',
  host: { class: 'landing-page', style: 'display:block' },
  template: `
    <div class="landing-page" [class.menu-open]="menuOpen">
      <header class="site-header" [class.scrolled]="scrolled" [class.menu-open]="menuOpen">
        <a class="site-brand" href="#top" [attr.aria-label]="locale.t('land.brand')" (click)="menuOpen = false">
          <img src="/assets/logo-auth.png" [attr.alt]="locale.t('brand.alt')" />
          <span>{{ locale.t('land.brand') }}</span>
        </a>
        <nav id="landing-nav" [attr.aria-label]="locale.t('land.navAria')" (click)="menuOpen = false">
          <a href="#services">{{ locale.t('land.nav.services') }}</a>
          <a href="#how">{{ locale.t('land.nav.how') }}</a>
          <a href="#experts">{{ locale.t('land.nav.experts') }}</a>
          <a href="#about">{{ locale.t('land.nav.about') }}</a>
        </nav>
        <div class="header-store-links" [attr.aria-label]="locale.t('land.storeAria')">
          <button class="store-badge google-play-badge" type="button" (click)="soon('Google Play')" aria-label="Get it on Google Play">
            <svg class="play-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M3.2 2.3C2.7 2.6 2.4 3.2 2.4 3.9v16.2c0 .7.3 1.3.8 1.6L13.6 12 3.2 2.3Z"/>
              <path fill="#34A853" d="M13.6 12 3.2 21.7c.4.2.9.2 1.3 0L18 15.2 13.6 12Z"/>
              <path fill="#FBBC04" d="M13.6 12 3.2 2.3c.4-.2.9-.2 1.3 0L18 8.8 13.6 12Z"/>
              <path fill="#EA4335" d="M21.2 10.7 18 8.8 13.6 12 18 15.2l3.2-1.9c1.1-.6 1.1-2 0-2.6Z"/>
            </svg>
            <span><small>GET IT ON</small><strong>Google Play</strong></span>
          </button>
          <button class="store-badge app-store-badge" type="button" (click)="soon('App Store')" aria-label="Download on the App Store">
            <svg class="apple-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#fff" d="M16.8 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9s-1.9-.9-3.1-.9c-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.8 2.4 3 2.3 1.2 0 1.7-.8 3.1-.8s1.8.8 3.1.8 2.1-.1 3-2.4c1.1-1.1 1.5-2.2 1.6-2.3 0 0-2.2-.8-2.2-3.3Zm-2.1-6.3c.7-.8 1.1-1.9 1-3-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 2.9 1.1.1 2.2-.6 2.9-1.4Z"/>
            </svg>
            <span><small>Download on the</small><strong>App Store</strong></span>
          </button>
        </div>
        <div class="header-actions">
          <div class="lang-switch" role="group" aria-label="Language">
            <button type="button" [class.active]="locale.lang() === 'ar'" (click)="locale.set('ar')">عربي</button>
            <button type="button" [class.active]="locale.lang() === 'en'" (click)="locale.set('en')">EN</button>
          </div>
          <a class="btn text-btn" routerLink="/login">{{ locale.t('land.login') }}</a>
          <a class="btn primary" routerLink="/signup">{{ locale.t('land.signup') }}</a>
        </div>
        <button
          class="menu-button"
          type="button"
          (click)="menuOpen = !menuOpen"
          [attr.aria-expanded]="menuOpen"
          aria-controls="landing-nav"
          [attr.aria-label]="menuOpen ? locale.t('land.menuClose') : locale.t('land.menuOpen')"
        >☰</button>
      </header>

      <main id="top">
        <section class="hero-section section-shell">
          <div class="hero-copy">
            <span class="eyebrow">{{ locale.t('land.hero.eyebrow') }}</span>
            <h1>{{ locale.t('land.hero.title1') }}<br /><em>{{ locale.t('land.hero.title2') }}</em></h1>
            <p>{{ locale.t('land.hero.text') }}</p>
            <div class="hero-actions">
              <a class="btn primary large" routerLink="/signup">{{ locale.t('land.hero.start') }}</a>
              <a class="btn secondary large" href="#services">{{ locale.t('land.hero.explore') }}</a>
            </div>
            <div class="hero-proof"><span>✓ {{ locale.t('land.hero.p1') }}</span><span>✓ {{ locale.t('land.hero.p2') }}</span><span>✓ {{ locale.t('land.hero.p3') }}</span></div>
          </div>
          <div class="hero-visual">
            <img class="hero-photo" src="/assets/photos/hero-makeup.jpg" width="1408" height="768" [attr.alt]="locale.t('land.hero.photoAlt')" fetchpriority="high" decoding="async" />
            <div class="visual-orbit one"></div>
            <div class="visual-orbit two"></div>
            <div class="browser-card">
              <div class="browser-head"><i></i><i></i><i></i><small>{{ locale.t('land.brand') }}</small></div>
              <div class="browser-body">
                <div class="visual-title"><span>{{ locale.t('land.hero.hi') }}</span><small>{{ locale.t('land.hero.ask') }}</small></div>
                <div class="visual-search">⌕ <span>{{ locale.t('land.hero.search') }}</span><b>{{ locale.t('land.hero.city') }}</b></div>
                <div class="visual-services">
                  <div><img src="/assets/icons/makeup.png" alt="" /><span>{{ locale.t('land.hero.makeup') }}</span></div>
                  <div><img src="/assets/icons/hair.png" alt="" /><span>{{ locale.t('land.hero.hair') }}</span></div>
                  <div><img src="/assets/icons/skincare.png" alt="" /><span>{{ locale.t('land.hero.skin') }}</span></div>
                </div>
                <div class="expert-mini">
                  <div class="mini-avatar">{{ locale.t('land.hero.initial') }}</div>
                  <div><b>{{ locale.t('land.hero.expert') }}</b><span>{{ locale.t('land.hero.expertMeta') }}</span></div>
                  <strong>★ 4.9</strong>
                </div>
              </div>
            </div>
            <div class="floating-card clients"><b>+50,000</b><span>{{ locale.t('land.hero.clients') }}</span></div>
            <div class="floating-card verified">✦ <span>{{ locale.t('land.hero.near') }}</span></div>
          </div>
        </section>

        <section class="trust-strip" [attr.aria-label]="locale.t('land.trust.aria')">
          <div><b>+1,200</b><span>{{ locale.t('land.trust.experts') }}</span></div>
          <div><b>+60</b><span>{{ locale.t('land.trust.subs') }}</span></div>
          <div><b>15</b><span>{{ locale.t('land.trust.cities') }}</span></div>
          <div><b>4.9</b><span>{{ locale.t('land.trust.rating') }}</span></div>
        </section>

        <section class="service-marquee" [attr.aria-label]="locale.t('land.marquee.aria')">
          <div class="marquee-track">
            <div class="marquee-group">
              @for (name of marquee; track name) {
                <span>{{ name }}</span><i>✦</i>
              }
            </div>
            <div class="marquee-group" aria-hidden="true">
              @for (name of marquee; track name + '-2') {
                <span>{{ name }}</span><i>✦</i>
              }
            </div>
          </div>
        </section>

        <section id="services" class="section-shell content-section">
          <div class="section-heading centered">
            <span class="eyebrow">{{ locale.t('land.services.eyebrow') }}</span>
            <h2>{{ locale.t('land.services.title') }}</h2>
            <p>{{ locale.t('land.services.sub') }}</p>
          </div>
          <div class="service-grid">
            @for (service of services; track service.code) {
              <article class="photo-service-card">
                <img class="service-photo" [src]="'/assets/service-photos/' + service.photo" [alt]="service.name" loading="lazy" decoding="async" />
                <div>
                  <img [src]="'/assets/icons/' + service.icon" alt="" loading="lazy" decoding="async" />
                  <h3>{{ service.name }}</h3>
                  <p>{{ service.text }}</p>
                </div>
              </article>
            }
          </div>
          <div class="center-action"><a class="btn secondary" routerLink="/signup">{{ locale.t('land.services.all') }}</a></div>
        </section>

        <section class="featured-section">
          <div class="section-shell">
            <div class="featured-intro">
              <div class="section-heading">
                <span class="eyebrow">{{ locale.t('land.feat.eyebrow') }}</span>
                <h2>{{ locale.t('land.feat.title') }}</h2>
                <p>{{ locale.t('land.feat.sub') }}</p>
              </div>
              <a class="btn primary" routerLink="/signup">{{ locale.t('land.feat.cta') }}</a>
            </div>
            <div class="featured-grid">
              <article class="featured-card featured-main">
                <div class="featured-cover has-photo">
                  <img src="/assets/expert-photos/expert-noor.webp" alt="" loading="lazy" decoding="async" />
                  <span>{{ locale.t('land.feat.badge1') }}</span>
                </div>
                <div class="featured-info"><div><h3>{{ locale.t('land.feat.n1') }}</h3><p>{{ locale.t('land.feat.n1m') }}</p></div><strong>★ 4.9</strong></div>
                <div class="featured-meta"><span>⌖ {{ locale.t('land.feat.city1') }}</span><span>{{ locale.tf('land.feat.reviews', { n: 42 }) }}</span><span>{{ locale.t('land.feat.available') }}</span></div>
                <a class="featured-action" routerLink="/signup">{{ locale.t('land.feat.view') }}</a>
              </article>
              <article class="featured-card">
                <div class="featured-cover second has-photo">
                  <img src="/assets/expert-photos/expert-maha.webp" alt="" loading="lazy" decoding="async" />
                  <span>{{ locale.t('land.feat.badge2') }}</span>
                </div>
                <div class="featured-info"><div><h3>{{ locale.t('land.feat.n2') }}</h3><p>{{ locale.t('land.feat.n2m') }}</p></div><strong>★ 4.8</strong></div>
                <div class="featured-meta"><span>⌖ {{ locale.t('land.feat.city2') }}</span><span>{{ locale.tf('land.feat.reviews', { n: 35 }) }}</span></div>
                <a class="featured-action" routerLink="/signup">{{ locale.t('land.feat.view') }}</a>
              </article>
              <article class="featured-card">
                <div class="featured-cover third has-photo">
                  <img src="/assets/expert-photos/expert-reem.webp" alt="" loading="lazy" decoding="async" />
                  <span>{{ locale.t('land.feat.badge3') }}</span>
                </div>
                <div class="featured-info"><div><h3>{{ locale.t('land.feat.n3') }}</h3><p>{{ locale.t('land.feat.n3m') }}</p></div><strong>★ 4.9</strong></div>
                <div class="featured-meta"><span>⌖ {{ locale.t('land.feat.city1') }}</span><span>{{ locale.tf('land.feat.reviews', { n: 51 }) }}</span></div>
                <a class="featured-action" routerLink="/signup">{{ locale.t('land.feat.view') }}</a>
              </article>
            </div>
          </div>
        </section>

        <section id="how" class="how-section">
          <div class="section-shell">
            <div class="section-heading">
              <span class="eyebrow">{{ locale.t('land.how.eyebrow') }}</span>
              <h2>{{ locale.t('land.how.title') }}</h2>
              <p>{{ locale.t('land.how.sub') }}</p>
            </div>
            <div class="steps-grid">
              <article><span>01</span><div class="step-icon">⌕</div><h3>{{ locale.t('land.how.s1') }}</h3><p>{{ locale.t('land.how.s1t') }}</p></article>
              <article><span>02</span><div class="step-icon">♡</div><h3>{{ locale.t('land.how.s2') }}</h3><p>{{ locale.t('land.how.s2t') }}</p></article>
              <article><span>03</span><div class="step-icon">↗</div><h3>{{ locale.t('land.how.s3') }}</h3><p>{{ locale.t('land.how.s3t') }}</p></article>
            </div>
          </div>
        </section>

        <section class="section-shell impact-section">
          <div class="impact-card customer-impact">
            <span class="impact-number">01</span>
            <div>
              <span class="eyebrow">{{ locale.t('land.imp.cEyebrow') }}</span>
              <h2>{{ locale.t('land.imp.cTitle') }}</h2>
              <p>{{ locale.t('land.imp.cText') }}</p>
              <div class="impact-points"><span>{{ locale.t('land.imp.c1') }}</span><span>{{ locale.t('land.imp.c2') }}</span><span>{{ locale.t('land.imp.c3') }}</span></div>
              <a class="btn primary" routerLink="/signup/phone" [queryParams]="{ role: 'customer' }">{{ locale.t('land.imp.cCta') }}</a>
            </div>
            <div class="impact-visual customer-visual has-customer-photo">
              <img src="/assets/photos/customer-browsing-clean.jpg" width="1448" height="1086" [attr.alt]="locale.t('land.imp.cAlt')" loading="lazy" decoding="async" />
            </div>
          </div>
          <div class="impact-card expert-impact">
            <span class="impact-number">02</span>
            <div>
              <span class="eyebrow light">{{ locale.t('land.imp.pEyebrow') }}</span>
              <h2>{{ locale.t('land.imp.pTitle') }}</h2>
              <p>{{ locale.t('land.imp.pText') }}</p>
              <div class="impact-points"><span>{{ locale.t('land.imp.p1') }}</span><span>{{ locale.t('land.imp.p2') }}</span><span>{{ locale.t('land.imp.p3') }}</span></div>
              <a class="btn light-btn" routerLink="/signup/phone" [queryParams]="{ role: 'provider' }">{{ locale.t('land.imp.pCta') }}</a>
            </div>
            <div class="impact-visual expert-visual">
              <div class="growth-ring"><b>+38%</b><small>{{ locale.t('land.imp.growth') }}</small></div>
              <div class="growth-bars"><i style="height:35%"></i><i style="height:48%"></i><i style="height:56%"></i><i style="height:76%"></i><i style="height:92%"></i></div>
            </div>
          </div>
        </section>

        <section id="experts" class="section-shell expert-section">
          <div class="expert-panel">
            <div class="expert-copy">
              <span class="eyebrow light">{{ locale.t('land.ex.eyebrow') }}</span>
              <h2>{{ locale.t('land.ex.title1') }}<br />{{ locale.t('land.ex.title2') }}</h2>
              <p>{{ locale.t('land.ex.text') }}</p>
              <ul>
                <li>{{ locale.t('land.ex.l1') }}</li>
                <li>{{ locale.t('land.ex.l2') }}</li>
                <li>{{ locale.t('land.ex.l3') }}</li>
                <li>{{ locale.t('land.ex.l4') }}</li>
              </ul>
              <a class="btn light-btn large" routerLink="/signup/phone" [queryParams]="{ role: 'provider' }">{{ locale.t('land.ex.cta') }}</a>
            </div>
            <div class="expert-dashboard">
              <div class="dash-top"><span>{{ locale.t('land.hero.expert') }}</span><b>{{ locale.t('land.ex.pkg') }}</b></div>
              <div class="dash-stats">
                <div><b>1,248</b><span>{{ locale.t('land.ex.views') }}</span></div>
                <div><b>86</b><span>{{ locale.t('land.ex.contacts') }}</span></div>
                <div><b>4.9</b><span>{{ locale.t('land.ex.rating') }}</span></div>
              </div>
              <small>{{ locale.t('land.ex.week') }}</small>
            </div>
          </div>
        </section>

        <section id="about" class="section-shell content-section">
          <div class="section-heading centered">
            <span class="eyebrow">{{ locale.t('land.about.eyebrow') }}</span>
            <h2>{{ locale.t('land.about.title') }}</h2>
          </div>
          <div class="benefit-grid">
            <article><i>◇</i><h3>{{ locale.t('land.about.b1') }}</h3><p>{{ locale.t('land.about.b1t') }}</p></article>
            <article><i>⌖</i><h3>{{ locale.t('land.about.b2') }}</h3><p>{{ locale.t('land.about.b2t') }}</p></article>
            <article><i>☆</i><h3>{{ locale.t('land.about.b3') }}</h3><p>{{ locale.t('land.about.b3t') }}</p></article>
            <article><i>↗</i><h3>{{ locale.t('land.about.b4') }}</h3><p>{{ locale.t('land.about.b4t') }}</p></article>
          </div>
        </section>

        <section id="faq" class="section-shell faq-section">
          <div class="section-heading centered">
            <span class="eyebrow">{{ locale.t('land.faq.eyebrow') }}</span>
            <h2>{{ locale.t('land.faq.title') }}</h2>
          </div>
          <div class="faq-list">
            <details open>
              <summary>{{ locale.t('land.faq.q1') }}</summary>
              <p>{{ locale.t('land.faq.a1') }}</p>
            </details>
            <details>
              <summary>{{ locale.t('land.faq.q2') }}</summary>
              <p>{{ locale.t('land.faq.a2') }}</p>
            </details>
            <details>
              <summary>{{ locale.t('land.faq.q3') }}</summary>
              <p>{{ locale.t('land.faq.a3') }}</p>
            </details>
            <details>
              <summary>{{ locale.t('land.faq.q4') }}</summary>
              <p>{{ locale.t('land.faq.a4') }}</p>
            </details>
          </div>
        </section>

        <section class="final-cta">
          <div>
            <img src="/assets/logo-auth.png" alt="" />
            <h2>{{ locale.t('land.cta.title') }}</h2>
            <p>{{ locale.t('land.cta.text') }}</p>
            <div>
              <a class="btn light-btn large" routerLink="/signup/phone" [queryParams]="{ role: 'customer' }">{{ locale.t('land.cta.customer') }}</a>
              <a class="btn outline-light large" routerLink="/signup/phone" [queryParams]="{ role: 'provider' }">{{ locale.t('land.cta.provider') }}</a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div class="footer-brand">
          <img src="/assets/logo-auth.png" alt="" />
          <div>
            <b>{{ locale.t('land.brand') }}</b>
            <span>{{ locale.t('land.foot.tag') }}</span>
            <p>{{ locale.t('land.foot.text') }}</p>
          </div>
        </div>
        <div>
          <b>{{ locale.t('land.foot.platform') }}</b>
          <a href="#services">{{ locale.t('land.nav.services') }}</a>
          <a href="#how">{{ locale.t('land.foot.how') }}</a>
          <a href="#experts">{{ locale.t('land.nav.experts') }}</a>
        </div>
        <div>
          <b>{{ locale.t('land.foot.help') }}</b>
          <a href="#faq">{{ locale.t('land.foot.faq') }}</a>
          <a routerLink="/legal/policies">{{ locale.t('land.foot.privacy') }}</a>
          <a routerLink="/legal/terms">{{ locale.t('land.foot.terms') }}</a>
        </div>
        <div class="footer-connect">
          <b>{{ locale.t('land.foot.account') }}</b>
          <a routerLink="/login">{{ locale.t('land.login') }}</a>
          <a routerLink="/signup">{{ locale.t('land.signup') }}</a>
          <b class="download-title">{{ locale.t('land.foot.download') }}</b>
          <div class="app-downloads">
            <button class="google-play-badge" type="button" (click)="soon('Google Play')" aria-label="Get it on Google Play">
              <svg class="play-mark" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M3.2 2.3C2.7 2.6 2.4 3.2 2.4 3.9v16.2c0 .7.3 1.3.8 1.6L13.6 12 3.2 2.3Z"/>
                <path fill="#34A853" d="M13.6 12 3.2 21.7c.4.2.9.2 1.3 0L18 15.2 13.6 12Z"/>
                <path fill="#FBBC04" d="M13.6 12 3.2 2.3c.4-.2.9-.2 1.3 0L18 8.8 13.6 12Z"/>
                <path fill="#EA4335" d="M21.2 10.7 18 8.8 13.6 12 18 15.2l3.2-1.9c1.1-.6 1.1-2 0-2.6Z"/>
              </svg>
              <span><small>GET IT ON</small><strong>Google Play</strong></span>
            </button>
            <button type="button" (click)="soon('App Store')" aria-label="Download on the App Store">
              <svg class="apple-mark" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#fff" d="M16.8 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9s-1.9-.9-3.1-.9c-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.8 2.4 3 2.3 1.2 0 1.7-.8 3.1-.8s1.8.8 3.1.8 2.1-.1 3-2.4c1.1-1.1 1.5-2.2 1.6-2.3 0 0-2.2-.8-2.2-3.3Zm-2.1-6.3c.7-.8 1.1-1.9 1-3-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 2.9 1.1.1 2.2-.6 2.9-1.4Z"/>
              </svg>
              <span><small>Download on the</small><strong>App Store</strong></span>
            </button>
          </div>
        </div>
        <small>{{ locale.t('land.foot.copy') }}</small>
      </footer>

      @if (toast) {
        <div class="placeholder-toast show" role="status">{{ toast }}</div>
      }
    </div>
  `,
})
export class LandingComponent {
  readonly locale = inject(LocaleService);
  menuOpen = false;
  scrolled = false;
  toast = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly serviceMeta = [
    { code: 'hair', photo: 'hair.webp', icon: 'hair.png' },
    { code: 'makeup', photo: 'makeup.webp', icon: 'makeup.png' },
    { code: 'microblading', photo: 'microblading.webp', icon: 'microblading.png' },
    { code: 'nails', photo: 'nails.webp', icon: 'nails.png' },
    { code: 'henna', photo: 'henna.webp', icon: 'henna.png' },
    { code: 'skincare', photo: 'skincare.webp', icon: 'skincare.png' },
    { code: 'bodycare', photo: 'bodycare.webp', icon: 'bodycare.png' },
    { code: 'dj', photo: 'dj.webp', icon: 'dj.png' },
    { code: 'events', photo: 'events.webp', icon: 'events.png' },
    { code: 'dresses', photo: 'dresses.webp', icon: 'dresses.png' },
    { code: 'photography', photo: 'photography.webp', icon: 'photography.png' },
    { code: 'model', photo: 'model.webp', icon: 'model.png' },
    { code: 'drinks', photo: 'drinks.webp', icon: 'drinks.png' },
    { code: 'piercing', photo: 'piercing.webp', icon: 'piercing.png' },
  ];

  get marquee(): string[] {
    return this.serviceMeta.map((service) =>
      service.code === 'dj' ? this.locale.t('land.svc.dj.marquee') : this.locale.t(`land.svc.${service.code}`),
    );
  }

  get services() {
    return this.serviceMeta.map((service) => ({
      ...service,
      name: this.locale.t(`land.svc.${service.code}`),
      text: this.locale.t(`land.svc.${service.code}.text`),
    }));
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 24;
    if (this.menuOpen && window.scrollY > 8) {
      this.menuOpen = false;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.menuOpen && window.innerWidth > 1180) {
      this.menuOpen = false;
    }
  }

  soon(name: string): void {
    this.toast = this.locale.tf('land.soon', { name });
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => (this.toast = ''), 2600);
  }
}
