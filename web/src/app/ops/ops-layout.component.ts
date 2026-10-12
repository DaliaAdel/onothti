import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { AppShellComponent, NavItem } from '../shared/app-shell.component';

@Component({
  selector: 'app-ops-layout',
  imports: [AppShellComponent, RouterOutlet],
  template: `
    <app-shell [items]="items" home="/ops" profileRoute="/ops/profile" notifyRoute="/ops/notifications">
      <router-outlet />
    </app-shell>
  `,
})
export class OpsLayoutComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);

  items: NavItem[] = [];

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

  private buildItems(): NavItem[] {
    const can = (...codes: string[]) => this.session.hasAnyPermission(...codes);
    const items: NavItem[] = [{ icon: 'home', label: 'لوحة  المعلومات', route: '/ops', exact: true }];
    if (can('MEDIA_REVIEW', 'PAYMENTS_REVIEW')) {
      items.push({ icon: 'image', label: 'اعتماد الملفات', route: '/ops/media' });
    }
    if (can('PROVIDERS_APPROVE')) {
      items.push({ icon: 'profile', label: 'اعتماد الحسابات', route: '/ops/accounts' });
    }
    if (can('RATINGS_REVIEW', 'TICKETS_MANAGE')) {
      items.push({ icon: 'ratings', label: 'المراجعات', route: '/ops/reviews' });
    }
    if (can('TICKETS_MANAGE')) {
      items.push({ icon: 'support', label: 'الطلبات', route: '/ops/tickets' });
    }
    const settingsChildren: NavItem[] = [];
    if (can('SETTINGS_MANAGE')) {
      settingsChildren.push({ icon: 'services', label: 'إعدادات التشغيل', route: '/ops/settings' });
    }
    if (can('BROADCAST_ALL', 'BROADCAST_PROVIDER', 'BROADCAST_CUSTOMER', 'NOTIFY_PROVIDER', 'NOTIFY_CUSTOMER')) {
      settingsChildren.push({ icon: 'bell', label: 'إشعارات المنصة', route: '/ops/notices' });
    }
    if (can('LEGAL_MANAGE')) {
      settingsChildren.push({ icon: 'about', label: 'اعدادات الشروط', route: '/ops/legal' });
    }
    if (can('GEO_MANAGE')) {
      settingsChildren.push({ icon: 'location', label: 'اعدادات المناطق', route: '/ops/geo' });
    }
    if (can('CATALOG_MANAGE')) {
      settingsChildren.push({ icon: 'services', label: 'اعدادات الخدمات', route: '/ops/catalog' });
    }
    if (can('PACKAGES_MANAGE')) {
      settingsChildren.push({ icon: 'package', label: 'اعدادات الباقات', route: '/ops/packages' });
    }
    if (can('CUSTOMERS_REVIEW', 'PROVIDERS_APPROVE')) {
      settingsChildren.push({ icon: 'expert', label: 'حسابات عملاء المنصة', route: '/ops/clients' });
    }
    if (can('USERS_MANAGE')) {
      settingsChildren.push({ icon: 'profile', label: 'حسابات موظفى المنصة', route: '/ops/staff' });
    }
    if (settingsChildren.length) {
      items.push({ icon: 'services', label: 'الإعدادات', children: settingsChildren });
    }
    if (can('REPORTS_VIEW')) {
      items.push({ icon: 'views', label: 'سجل الأحداث', route: '/ops/events' });
      items.push({ icon: 'views', label: 'نشاط الفريق', route: '/ops/activity' });
    }
    items.push({ icon: 'bell', label: 'التنبيهات', route: '/ops/notifications' });
    items.push({ icon: 'profile', label: 'الملف الشخصي', route: '/ops/profile' });
    items.push({ icon: 'about', label: 'حول المنصة', route: '/ops/about' });
    return items;
  }
}
