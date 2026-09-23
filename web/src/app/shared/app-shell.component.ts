import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { BrandComponent } from './brand.component';
import { IconComponent } from './icon.component';

export interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  imports: [BrandComponent, IconComponent, RouterLink, RouterLinkActive],
  template: `
    <div class="app">
      <aside class="sidebar">
        <app-brand [link]="home" />
        <div class="nav-label">{{ locale.t('nav.menu') }}</div>
        <nav class="nav">
          @for (item of items; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact ?? false }">
              <span class="nav-icon"><app-icon [name]="item.icon" /></span>
              <span>{{ locale.t(item.label) }}</span>
            </a>
          }
        </nav>
        <div class="sidebar-foot">
          <button class="account-mini logout" type="button" (click)="logout()">
            <div class="avatar">{{ initial }}</div>
            <div>
              <strong>{{ name }}</strong>
              <span>{{ roleLabel }}</span>
            </div>
            <app-icon name="chev" />
          </button>
        </div>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <div class="page-title">
            <h1>{{ shell.title() }}</h1>
            <p>{{ shell.subtitle() }}</p>
          </div>
          <div class="top-actions">
            <div class="lang-switch" role="group" aria-label="Language">
              <button type="button" [class.active]="locale.lang() === 'ar'" (click)="locale.set('ar')">عربي</button>
              <button type="button" [class.active]="locale.lang() === 'en'" (click)="locale.set('en')">EN</button>
            </div>
            <button class="icon-btn has-dot" type="button" (click)="toast.show(locale.t('toast.notifications'))">
              <app-icon name="bell" />
            </button>
            <button class="icon-btn" type="button" (click)="toast.show(locale.t('toast.help'))">
              <app-icon name="help" />
            </button>
          </div>
        </header>
        <main class="main reveal">
          <ng-content />
        </main>
      </section>
    </div>
  `,
})
export class AppShellComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly toast = inject(ToastService);
  readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);

  @Input({ required: true }) items: (NavItem & { exact?: boolean })[] = [];
  @Input() home = '/c';

  get name(): string {
    return this.session.user()?.displayName || this.locale.t('account.mine');
  }

  get initial(): string {
    return this.name.slice(0, 1);
  }

  get roleLabel(): string {
    return this.session.user()?.accountType === 'PROVIDER' ? this.locale.t('role.provider') : this.locale.t('role.customer');
  }

  logout(): void {
    this.session.clear();
    this.toast.show(this.locale.t('toast.logout'));
    void this.router.navigateByUrl('/login');
  }
}
