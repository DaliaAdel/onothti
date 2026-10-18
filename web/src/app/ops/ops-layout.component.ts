import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { AppShellComponent, NavItem } from '../shared/app-shell.component';
import { canOpenOpsPage, type OpsPage } from './ops-access';

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
          teamId: me.teamId,
          orgTeam: me.orgTeam,
        });
        this.items = this.buildItems();
      },
    });
  }

  private buildItems(): NavItem[] {
    const can = (page: OpsPage) => canOpenOpsPage(this.session, page);
    const items: NavItem[] = [{ icon: 'home', label: 'لوحة  المعلومات', route: '/ops', exact: true }];
    if (can('approvals')) {
      items.push({ icon: 'ratings', label: 'الاعتمادات', route: '/ops/approvals' });
    }
    if (can('tickets')) {
      items.push({ icon: 'support', label: 'الطلبات', route: '/ops/tickets' });
    }
    if (can('clients')) {
      items.push({ icon: 'expert', label: 'حسابات عملاء المنصة', route: '/ops/clients' });
    }
    if (can('notices')) {
      items.push({ icon: 'bell', label: 'إشعارات المنصة', route: '/ops/notices' });
    }
    const settingsChildren: NavItem[] = [];
    if (can('settings')) {
      settingsChildren.push({ icon: 'services', label: 'إعدادات التشغيل', route: '/ops/settings' });
    }
    if (can('legal')) {
      settingsChildren.push({ icon: 'about', label: 'اعدادات الشروط', route: '/ops/legal' });
    }
    if (can('geo')) {
      settingsChildren.push({ icon: 'location', label: 'اعدادات المناطق', route: '/ops/geo' });
    }
    if (can('catalog')) {
      settingsChildren.push({ icon: 'services', label: 'اعدادات الخدمات', route: '/ops/catalog' });
    }
    if (can('packages')) {
      settingsChildren.push({ icon: 'package', label: 'اعدادات الباقات', route: '/ops/packages' });
    }
    if (can('org')) {
      settingsChildren.push({ icon: 'profile', label: 'الهيكل التنظيمي', route: '/ops/org' });
    }
    if (can('staff')) {
      settingsChildren.push({ icon: 'profile', label: 'حسابات موظفى المنصة', route: '/ops/staff' });
    }
    if (can('permissions')) {
      settingsChildren.push({ icon: 'profile', label: 'إعدادات الصلاحيات', route: '/ops/permissions' });
    }
    if (settingsChildren.length) {
      items.push({ icon: 'services', label: 'الإعدادات', children: settingsChildren });
    }
    if (can('activity')) {
      items.push({ icon: 'views', label: 'نشاط الفريق', route: '/ops/activity' });
    }
    items.push({ icon: 'bell', label: 'التنبيهات', route: '/ops/notifications' });
    items.push({ icon: 'profile', label: 'الملف الشخصي', route: '/ops/profile' });
    items.push({ icon: 'about', label: 'حول المنصة', route: '/ops/about' });
    return items;
  }
}
