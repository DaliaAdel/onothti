import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { ApiService } from '../core/api.service';
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
        <nav class="nav">
          @for (item of items; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact ?? false }">
              <span class="ico nav-icon"><app-icon [name]="item.icon" /></span>
              <span>{{ locale.t(item.label) }}</span>
            </a>
          }
        </nav>
        <div class="sidebar-foot">
          <button class="logout" type="button" (click)="logout()">
            <span class="ico nav-icon"><app-icon name="logout" /></span>
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="crumb">
            @if (home === '/c') {
              <small>حساب العميلة</small>
            }
            @if (home === '/p') {
              <small>حساب الخبيرة</small>
            }
            @if (home === '/ops') {
              <small>المشغّل الإداري</small>
            }
            <b>{{ shell.title() }}</b>
          </div>
          <div class="top-actions">
            <a class="city" [routerLink]="profileRoute">
              <span class="ico"><app-icon name="pin" /></span>
              {{ cityLabel }}
            </a>
            <div class="lang-switch" role="group" aria-label="Language">
              <button type="button" [class.active]="locale.lang() === 'ar'" (click)="locale.set('ar')">عربي</button>
              <button type="button" [class.active]="locale.lang() === 'en'" (click)="locale.set('en')">EN</button>
            </div>
            <a class="icon-btn" [routerLink]="notifyRoute">
              <span class="ico"><app-icon name="bell" /></span>
            </a>
            <div class="avatar">{{ initial }}</div>
          </div>
        </header>
        <section class="content">
          <ng-content />
        </section>
      </main>
    </div>
  `,
})
export class AppShellComponent {
  private readonly session = inject(SessionService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly toast = inject(ToastService);
  readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);

  @Input({ required: true }) items: (NavItem & { exact?: boolean })[] = [];
  @Input() home = '/c';
  @Input() profileRoute = '/c/account';
  @Input() notifyRoute = '/c/notifications';

  get name(): string {
    return this.session.user()?.displayName || this.locale.t('account.mine');
  }

  get initial(): string {
    return this.name.slice(0, 1);
  }

  get cityLabel(): string {
    return this.session.user()?.city
      ? this.locale.localizedName(this.session.user()!.city)
      : 'المدينة';
  }

  logout(): void {
    if (!confirm('نتمنى لكِ يومًا جميلًا. هل تريدين تسجيل الخروج؟')) {
      return;
    }
    const finish = () => {
      this.session.clear();
      this.toast.show(this.locale.t('toast.logout'));
      void this.router.navigateByUrl('/login');
    };
    this.api.logout().subscribe({ next: finish, error: finish });
  }
}
