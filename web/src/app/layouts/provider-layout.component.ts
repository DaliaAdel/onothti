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
    { icon: 'user', label: 'nav.profile', route: '/p/account' },
    { icon: 'grid', label: 'nav.myServices', route: '/p/services' },
    { icon: 'brief', label: 'nav.portfolio', route: '/p/portfolio' },
    { icon: 'chart', label: 'nav.views', route: '/p/views' },
    { icon: 'heart', label: 'nav.reviews', route: '/p/reviews' },
    { icon: 'card', label: 'nav.package', route: '/p/package' },
    { icon: 'card', label: 'nav.payment', route: '/p/payment' },
    { icon: 'bell', label: 'nav.paymentStatus', route: '/p/payment-status' },
    { icon: 'bell', label: 'nav.notifications', route: '/p/notifications' },
    { icon: 'help', label: 'nav.support', route: '/p/support' },
  ];
}
