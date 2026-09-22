import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
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
        <div class="nav-label">القائمة الرئيسية</div>
        <nav class="nav">
          @for (item of items; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.exact ?? false }">
              <span class="nav-icon"><app-icon [name]="item.icon" /></span>
              <span>{{ item.label }}</span>
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
            <button class="icon-btn has-dot" type="button" (click)="toast.show('لديكِ إشعارات جديدة')">
              <app-icon name="bell" />
            </button>
            <button class="icon-btn" type="button" (click)="toast.show('مركز المساعدة جاهز')">
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

  @Input({ required: true }) items: (NavItem & { exact?: boolean })[] = [];
  @Input() home = '/c';

  get name(): string {
    return this.session.user()?.displayName || 'حسابي';
  }

  get initial(): string {
    return this.name.slice(0, 1);
  }

  get roleLabel(): string {
    return this.session.user()?.accountType === 'PROVIDER' ? 'صانعة جمال' : 'باحثة عن الأنوثة';
  }

  logout(): void {
    this.session.clear();
    this.toast.show('تم تسجيل الخروج');
    void this.router.navigateByUrl('/login');
  }
}
