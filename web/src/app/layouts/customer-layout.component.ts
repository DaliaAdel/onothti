import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppShellComponent, NavItem } from '../shared/app-shell.component';

@Component({
  selector: 'app-customer-layout',
  imports: [AppShellComponent, RouterOutlet],
  template: `
    <app-shell [items]="items" home="/c">
      <router-outlet />
    </app-shell>
  `,
})
export class CustomerLayoutComponent {
  readonly items: (NavItem & { exact?: boolean })[] = [
    { icon: 'home', label: 'الرئيسية', route: '/c', exact: true },
    { icon: 'search', label: 'تصفح الخدمات', route: '/c/services' },
    { icon: 'heart', label: 'المفضلة', route: '/c/favorites' },
    { icon: 'bag', label: 'طلباتي', route: '/c/requests' },
    { icon: 'bell', label: 'الإشعارات', route: '/c/notifications' },
    { icon: 'user', label: 'حسابي', route: '/c/account' },
  ];
}
