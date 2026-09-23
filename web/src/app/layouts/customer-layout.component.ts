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
    { icon: 'home', label: 'nav.home', route: '/c', exact: true },
    { icon: 'search', label: 'nav.services', route: '/c/services' },
    { icon: 'heart', label: 'nav.favorites', route: '/c/favorites' },
    { icon: 'bag', label: 'nav.requests', route: '/c/requests' },
    { icon: 'bell', label: 'nav.notifications', route: '/c/notifications' },
    { icon: 'user', label: 'nav.account', route: '/c/account' },
  ];
}
