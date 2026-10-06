import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { AppShellComponent, NavItem } from '../shared/app-shell.component';

@Component({
  selector: 'app-ops-layout',
  imports: [AppShellComponent, RouterOutlet],
  template: `
    <app-shell [items]="items" home="/ops" profileRoute="/ops" notifyRoute="/ops">
      <router-outlet />
    </app-shell>
  `,
})
export class OpsLayoutComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);

  items: (NavItem & { exact?: boolean })[] = [];

  ngOnInit(): void {
    this.items = this.buildItems();
    this.api.opsMe().subscribe({
      next: (me) => {
        this.session.patchUser({
          permissions: me.permissions,
          roleCode: me.role?.code,
          roleNameAr: me.role?.nameAr,
        });
        this.items = this.buildItems();
      },
    });
  }

  private buildItems(): (NavItem & { exact?: boolean })[] {
    const can = (...codes: string[]) => this.session.hasAnyPermission(...codes);
    const items: (NavItem & { exact?: boolean })[] = [{ icon: 'home', label: 'لوحة التشغيل', route: '/ops', exact: true }];
    if (can('MEDIA_REVIEW', 'PAYMENTS_REVIEW')) {
      items.push({ icon: 'image', label: 'اعتماد الملفات', route: '/ops/media' });
    }
    if (can('PROVIDERS_APPROVE')) {
      items.push({ icon: 'user', label: 'اعتماد الحسابات', route: '/ops/accounts' });
    }
    if (can('RATINGS_REVIEW', 'TICKETS_MANAGE')) {
      items.push({ icon: 'star', label: 'المراجعات', route: '/ops/reviews' });
    }
    if (can('PACKAGES_MANAGE')) {
      items.push({ icon: 'card', label: 'الباقات', route: '/ops/packages' });
    }
    if (can('CATALOG_MANAGE')) {
      items.push({ icon: 'bag', label: 'الخدمات', route: '/ops/catalog' });
    }
    if (can('TICKETS_MANAGE')) {
      items.push({ icon: 'chart', label: 'الطلبات', route: '/ops/tickets' });
    }
    if (can('GEO_MANAGE')) {
      items.push({ icon: 'pin', label: 'المناطق', route: '/ops/geo' });
    }
    if (can('SETTINGS_MANAGE')) {
      items.push({ icon: 'grid', label: 'الإعدادات', route: '/ops/settings' });
    }
    if (can('LEGAL_MANAGE')) {
      items.push({ icon: 'help', label: 'الشروط', route: '/ops/legal' });
    }
    if (can('USERS_MANAGE')) {
      items.push({ icon: 'brief', label: 'المستخدمون', route: '/ops/staff' });
    }
    return items;
  }
}
