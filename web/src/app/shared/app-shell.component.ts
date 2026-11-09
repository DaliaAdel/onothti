import { Component, DestroyRef, HostListener, Input, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { LocaleService } from '../core/locale.service';
import { SessionService } from '../core/session.service';
import { ShellService } from '../core/shell.service';
import { ToastService } from '../core/toast.service';
import { ApiService } from '../core/api.service';
import { mediaUrl } from '../core/media';
import { AuthLayoutComponent } from './auth-layout.component';
import { BrandComponent } from './brand.component';
import { IconComponent } from './icon.component';

export interface NavItem {
  icon: string;
  label: string;
  route?: string;
  exact?: boolean;
  children?: NavItem[];
}

@Component({
  selector: 'app-shell',
  imports: [AuthLayoutComponent, BrandComponent, IconComponent, RouterLink, RouterLinkActive],
  template: `
    <div class="app" [class.ops-app]="home === '/ops'" [class.menu-open]="menuOpen">
      <button class="nav-backdrop" type="button" [attr.aria-label]="locale.t('shell.closeMenu')" (click)="closeMenu()"></button>
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-top">
          <app-brand [link]="home" />
          <button class="menu-close icon-btn" type="button" [attr.aria-label]="locale.t('shell.closeMenu')" (click)="closeMenu()">×</button>
        </div>
        @if (home === '/ops') {
          <div class="role-card">
            <b>{{ name }}</b>
            <span>{{ roleLabel }}</span>
          </div>
        }
        <nav class="nav" (click)="onNavClick($event)">
          @for (item of items; track item.route || item.label) {
            @if (item.children?.length) {
              <div class="nav-folder" [class.open]="isFolderOpen(item)">
                <button class="nav-folder-toggle" type="button" (click)="toggleFolder(item)">
                  <span class="ico nav-icon"><app-icon [name]="item.icon" /></span>
                  <span>{{ locale.t(item.label) }}</span>
                  <span class="nav-folder-chev" [class.open]="isFolderOpen(item)"><app-icon name="chev" /></span>
                </button>
                @if (isFolderOpen(item)) {
                  <div class="nav-sub">
                    @for (child of item.children; track child.route) {
                      <a
                        [routerLink]="child.route"
                        routerLinkActive="active"
                        [routerLinkActiveOptions]="{ exact: child.exact ?? false }"
                      >
                        <span class="ico nav-icon"><app-icon [name]="child.icon" /></span>
                        <span>{{ locale.t(child.label) }}</span>
                      </a>
                    }
                  </div>
                }
              </div>
            } @else if (item.route) {
              <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact ?? false }">
                <span class="ico nav-icon"><app-icon [name]="item.icon" /></span>
                <span>{{ locale.t(item.label) }}</span>
              </a>
            }
          }
        </nav>
        <div class="sidebar-foot">
          <div class="lang-switch sidebar-lang" role="group" aria-label="Language">
            <button type="button" [class.active]="locale.lang() === 'ar'" (click)="locale.set('ar')">عربي</button>
            <button type="button" [class.active]="locale.lang() === 'en'" (click)="locale.set('en')">EN</button>
          </div>
          <button class="logout" type="button" (click)="logout()">
            <span class="ico nav-icon"><app-icon name="logout" /></span>
            {{ locale.t('shell.logout') }}
          </button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <button
            class="menu-toggle icon-btn"
            type="button"
            [attr.aria-expanded]="menuOpen"
            aria-controls="app-sidebar"
            [attr.aria-label]="locale.t('shell.menu')"
            (click)="toggleMenu()"
          >
            <span class="menu-bars" [class.open]="menuOpen" aria-hidden="true"><i></i><i></i><i></i></span>
          </button>
          <div class="crumb">
            @if (home === '/c') {
              <small>{{ locale.t('shell.customerAccount') }}</small>
            }
            @if (home === '/p') {
              <small>{{ locale.t('shell.providerAccount') }}</small>
            }
            <b>{{ locale.t(shell.title()) }}</b>
          </div>
          <div class="top-actions">
            @if (home === '/ops') {
              <div class="online-pills" [attr.aria-label]="locale.t('shell.onlineNow')">
                <span class="online-pill" [attr.title]="locale.t('shell.onlineCustomers')">
                  <i class="online-dot" aria-hidden="true"></i>
                  <span class="online-label">{{ locale.t('shell.onlineCustomers') }}</span>
                  <b>{{ onlineCustomers }}</b>
                </span>
                <span class="online-pill" [attr.title]="locale.t('shell.onlineProviders')">
                  <i class="online-dot" aria-hidden="true"></i>
                  <span class="online-label">{{ locale.t('shell.onlineProviders') }}</span>
                  <b>{{ onlineProviders }}</b>
                </span>
              </div>
              <a class="city" [routerLink]="profileRoute">{{ roleLabel }}</a>
            } @else {
              <a class="city" [routerLink]="profileRoute">
                <span class="ico"><app-icon name="pin" /></span>
                <span class="city-text">{{ cityLabel }}</span>
              </a>
            }
            <div class="lang-switch" role="group" aria-label="Language">
              <button type="button" [class.active]="locale.lang() === 'ar'" (click)="locale.set('ar')">عربي</button>
              <button type="button" [class.active]="locale.lang() === 'en'" (click)="locale.set('en')">EN</button>
            </div>
            <a class="icon-btn" [class.has-dot]="unread > 0" [routerLink]="notifyRoute">
              <span class="ico"><app-icon name="bell" /></span>
            </a>
            <a
              class="avatar"
              [class.has-photo]="!!avatarUrl"
              [routerLink]="profileRoute"
              [style.background-image]="avatarUrl ? 'url(' + avatarUrl + ')' : 'none'"
              [attr.aria-label]="locale.t('shell.profile')"
            >
              @if (!avatarUrl) {
                <app-icon name="profile" />
              }
            </a>
          </div>
        </header>
        <section class="content">
          <ng-content />
        </section>
      </main>
    </div>
    @if (logoutOpen) {
      <div class="logout-auth" role="dialog" aria-modal="true" aria-labelledby="logout-title">
        <app-auth-layout>
          <div class="auth-box">
            <button class="auth-back" type="button" (click)="cancelLogout()">← {{ locale.t('shell.stay') }}</button>
            <span class="auth-kicker">{{ locale.t('shell.logoutKicker') }}</span>
            <h2 id="logout-title">{{ locale.t('shell.logoutTitle') }}</h2>
            <p class="muted">{{ locale.t('shell.logoutText') }}</p>
            <button class="btn primary auth-submit full" type="button" [disabled]="loggingOut" (click)="confirmLogout()">
              {{ locale.t('shell.logout') }}
            </button>
          </div>
        </app-auth-layout>
      </div>
    }
  `,
})
export class AppShellComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly toast = inject(ToastService);
  readonly shell = inject(ShellService);
  readonly locale = inject(LocaleService);

  @Input({ required: true }) items: NavItem[] = [];
  private readonly openedFolders = new Set<string>();
  @Input() home = '/c';
  @Input() profileRoute = '/c/account';
  @Input() notifyRoute = '/c/notifications';
  menuOpen = false;
  logoutOpen = false;
  loggingOut = false;

  get name(): string {
    return this.session.user()?.displayName || this.locale.t('account.mine');
  }

  get avatarUrl(): string {
    return mediaUrl(this.session.user()?.avatarUrl);
  }

  unread = 0;
  onlineCustomers = 0;
  onlineProviders = 0;

  get cityLabel(): string {
    return this.session.user()?.city
      ? this.locale.localizedName(this.session.user()!.city)
      : this.locale.t('shell.city');
  }

  get roleLabel(): string {
    const user = this.session.user();
    return this.locale.localizedName({ nameAr: user?.roleNameAr, nameEn: user?.roleNameEn }, this.locale.t('shell.opsAccount'));
  }

  isFolderOpen(item: NavItem): boolean {
    return this.openedFolders.has(item.label) || this.isFolderActive(item);
  }

  isFolderActive(item: NavItem): boolean {
    const url = this.router.url.split('?')[0];
    return (item.children ?? []).some(
      (child) => !!child.route && (url === child.route || url.startsWith(`${child.route}/`)),
    );
  }

  toggleFolder(item: NavItem): void {
    if (this.openedFolders.has(item.label)) {
      this.openedFolders.delete(item.label);
    } else {
      this.openedFolders.add(item.label);
    }
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.closeMenu());
    this.api.notifications().subscribe({
      next: (items) => {
        this.unread = items.filter((item) => !item.readAt).length;
      },
    });
    this.pingPresence();
    const timer = setInterval(() => this.pingPresence(), 45_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
    if (this.home === '/ops') {
      this.refreshOpsPresence();
      const presenceTimer = setInterval(() => this.refreshOpsPresence(), 45_000);
      this.destroyRef.onDestroy(() => clearInterval(presenceTimer));
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  onNavClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('a[href]')) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.logoutOpen) {
      this.cancelLogout();
      return;
    }
    this.closeMenu();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth > 900) {
      this.closeMenu();
    }
  }

  @HostListener('document:visibilitychange')
  onVisibility(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.pingPresence();
    }
  }

  logout(): void {
    this.logoutOpen = true;
  }

  private refreshOpsPresence(): void {
    this.api.opsPresence().subscribe({
      next: (data) => {
        this.onlineCustomers = data.onlineCustomers;
        this.onlineProviders = data.onlineProviders;
      },
      error: () => undefined,
    });
  }

  private pingPresence(): void {
    if (this.loggingOut || !this.session.isLoggedIn) {
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    this.api.pingPresence().subscribe({ error: () => undefined });
  }

  cancelLogout(): void {
    if (this.loggingOut) {
      return;
    }
    this.logoutOpen = false;
  }

  confirmLogout(): void {
    if (this.loggingOut) {
      return;
    }
    this.loggingOut = true;
    const finish = () => {
      this.session.clear();
      this.logoutOpen = false;
      this.loggingOut = false;
      this.toast.show(this.locale.t('toast.logout'));
      void this.router.navigateByUrl('/login');
    };
    this.api.logout().subscribe({ next: finish, error: finish });
  }
}
