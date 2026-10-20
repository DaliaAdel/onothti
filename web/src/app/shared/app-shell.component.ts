import { Component, DestroyRef, HostListener, Input, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
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
  route?: string;
  exact?: boolean;
  children?: NavItem[];
}

@Component({
  selector: 'app-shell',
  imports: [BrandComponent, IconComponent, RouterLink, RouterLinkActive],
  template: `
    <div class="app" [class.ops-app]="home === '/ops'" [class.menu-open]="menuOpen">
      <button class="nav-backdrop" type="button" aria-label="إغلاق القائمة" (click)="closeMenu()"></button>
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-top">
          <app-brand [link]="home" />
          <button class="menu-close icon-btn" type="button" aria-label="إغلاق القائمة" (click)="closeMenu()">×</button>
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
          <button class="logout" type="button" (click)="logout()">
            <span class="ico nav-icon"><app-icon name="logout" /></span>
            تسجيل الخروج
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
            aria-label="القائمة"
            (click)="toggleMenu()"
          >
            <span class="menu-bars" [class.open]="menuOpen" aria-hidden="true"><i></i><i></i><i></i></span>
          </button>
          <div class="crumb">
            @if (home === '/c') {
              <small>حساب العميلة</small>
            }
            @if (home === '/p') {
              <small>حساب الخبيرة</small>
            }
            <b>{{ shell.title() }}</b>
          </div>
          <div class="top-actions">
            @if (home === '/ops') {
              <a class="city" [routerLink]="profileRoute">{{ roleLabel }}</a>
            } @else {
              <a class="city" [routerLink]="profileRoute">
                <span class="ico"><app-icon name="pin" /></span>
                {{ cityLabel }}
              </a>
            }
            <div class="lang-switch" role="group" aria-label="Language">
              <button type="button" [class.active]="locale.lang() === 'ar'" (click)="locale.set('ar')">عربي</button>
              <button type="button" [class.active]="locale.lang() === 'en'" (click)="locale.set('en')">EN</button>
            </div>
            <a class="icon-btn" [class.has-dot]="unread > 0" [routerLink]="notifyRoute">
              <span class="ico"><app-icon name="bell" /></span>
            </a>
            <a class="avatar" [routerLink]="profileRoute">{{ initial }}</a>
          </div>
        </header>
        <section class="content">
          <ng-content />
        </section>
      </main>
    </div>
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

  get name(): string {
    return this.session.user()?.displayName || this.locale.t('account.mine');
  }

  get initial(): string {
    return this.name.slice(0, 1);
  }

  unread = 0;

  get cityLabel(): string {
    return this.session.user()?.city
      ? this.locale.localizedName(this.session.user()!.city)
      : 'المدينة';
  }

  get roleLabel(): string {
    return this.session.user()?.roleNameAr || 'حساب تشغيلي';
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
    this.closeMenu();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth > 900) {
      this.closeMenu();
    }
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
