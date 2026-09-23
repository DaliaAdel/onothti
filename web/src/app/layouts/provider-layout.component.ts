import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppShellComponent, NavItem } from '../shared/app-shell.component';

@Component({
  selector: 'app-provider-layout',
  imports: [AppShellComponent, RouterOutlet],
  template: `
    <app-shell [items]="items" home="/p">
      <router-outlet />
    </app-shell>
  `,
})
export class ProviderLayoutComponent {
  readonly items: (NavItem & { exact?: boolean })[] = [
    { icon: 'home', label: 'nav.home', route: '/p', exact: true },
    { icon: 'spark', label: 'nav.myServices', route: '/p/services' },
    { icon: 'image', label: 'nav.portfolio', route: '/p/portfolio' },
    { icon: 'star', label: 'nav.reviews', route: '/p/reviews' },
    { icon: 'eye', label: 'nav.views', route: '/p/views' },
    { icon: 'diamond', label: 'nav.package', route: '/p/package' },
    { icon: 'help', label: 'nav.support', route: '/p/support' },
    { icon: 'user', label: 'nav.account', route: '/p/account' },
  ];
}
