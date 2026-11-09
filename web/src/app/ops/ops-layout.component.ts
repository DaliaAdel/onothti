import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { AppShellComponent, NavItem } from '../shared/app-shell.component';
import { canOpenOpsPage, canOpenPermissionSettings, type OpsPage } from './ops-access';

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
          roleNameEn: me.role?.nameEn,
          teamId: me.teamId,
          orgTeam: me.orgTeam,
        });
        this.items = this.buildItems();
      },
    });
  }

  private buildItems(): NavItem[] {
    const can = (page: OpsPage) => canOpenOpsPage(this.session, page);
    const items: NavItem[] = [{ icon: 'home', label: 'ops.nav.dashboard', route: '/ops', exact: true }];
    if (can('approvals')) {
      items.push({ icon: 'ratings', label: 'ops.nav.approvals', route: '/ops/approvals' });
    }
    if (can('tickets')) {
      items.push({ icon: 'support', label: 'ops.nav.tickets', route: '/ops/tickets' });
    }
    if (can('clients')) {
      items.push({ icon: 'expert', label: 'ops.nav.clients', route: '/ops/clients' });
    }
    if (can('notices')) {
      items.push({ icon: 'bell', label: 'ops.nav.notices', route: '/ops/notices' });
    }
    const settingsChildren: NavItem[] = [];
    if (can('settings')) {
      settingsChildren.push({ icon: 'services', label: 'ops.nav.settingsOps', route: '/ops/settings' });
    }
    if (can('legal')) {
      settingsChildren.push({ icon: 'about', label: 'ops.nav.settingsLegal', route: '/ops/legal' });
    }
    if (can('geo')) {
      settingsChildren.push({ icon: 'location', label: 'ops.nav.settingsGeo', route: '/ops/geo' });
    }
    if (can('catalog')) {
      settingsChildren.push({ icon: 'services', label: 'ops.nav.settingsCatalog', route: '/ops/catalog' });
    }
    if (can('packages')) {
      settingsChildren.push({ icon: 'package', label: 'ops.nav.settingsPackages', route: '/ops/packages' });
    }
    if (can('org')) {
      settingsChildren.push({ icon: 'profile', label: 'ops.nav.settingsOrg', route: '/ops/org' });
    }
    if (can('staff')) {
      settingsChildren.push({ icon: 'profile', label: 'ops.nav.settingsStaff', route: '/ops/staff' });
    }
    if (canOpenPermissionSettings(this.session)) {
      settingsChildren.push({ icon: 'profile', label: 'ops.nav.settingsPerms', route: '/ops/permissions' });
    }
    if (settingsChildren.length) {
      items.push({ icon: 'services', label: 'ops.nav.settings', children: settingsChildren });
    }
    if (can('activity')) {
      items.push({ icon: 'views', label: 'ops.nav.activity', route: '/ops/activity' });
    }
    items.push({ icon: 'bell', label: 'ops.nav.notifications', route: '/ops/notifications' });
    items.push({ icon: 'profile', label: 'ops.nav.profile', route: '/ops/profile' });
    items.push({ icon: 'about', label: 'ops.nav.about', route: '/ops/about' });
    return items;
  }
}
