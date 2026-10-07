import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppShellComponent, NavItem } from '../shared/app-shell.component';

@Component({
  selector: 'app-provider-layout',
  imports: [AppShellComponent, RouterOutlet],
  template: `
    <app-shell [items]="items" home="/p" profileRoute="/p/account" notifyRoute="/p/notifications">
      <router-outlet />
    </app-shell>
  `,
})
export class ProviderLayoutComponent {
  readonly items: (NavItem & { exact?: boolean })[] = [
    { icon: 'home', label: 'nav.dashboard', route: '/p', exact: true },
    { icon: 'profile', label: 'nav.profile', route: '/p/account' },
    { icon: 'services', label: 'nav.myServices', route: '/p/services' },
    { icon: 'image', label: 'nav.portfolio', route: '/p/portfolio' },
    { icon: 'views', label: 'nav.views', route: '/p/views' },
    { icon: 'ratings', label: 'nav.reviews', route: '/p/reviews' },
    { icon: 'package', label: 'nav.package', route: '/p/package' },
    { icon: 'package', label: 'nav.payment', route: '/p/payment' },
    { icon: 'package', label: 'nav.paymentStatus', route: '/p/payment-status' },
    { icon: 'bell', label: 'nav.notifications', route: '/p/notifications' },
    { icon: 'support', label: 'nav.support', route: '/p/support' },
  ];
}
