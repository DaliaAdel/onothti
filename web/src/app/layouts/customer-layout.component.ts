import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FavoritesService } from '../core/favorites.service';
import { AppShellComponent, NavItem } from '../shared/app-shell.component';

@Component({
  selector: 'app-customer-layout',
  imports: [AppShellComponent, RouterOutlet],
  template: `
    <app-shell [items]="items" home="/c" profileRoute="/c/account" notifyRoute="/c/notifications">
      <router-outlet />
    </app-shell>
  `,
})
export class CustomerLayoutComponent implements OnInit {
  private readonly favorites = inject(FavoritesService);

  ngOnInit(): void {
    this.favorites.ensureLoaded();
  }

  readonly items: (NavItem & { exact?: boolean })[] = [
    { icon: 'home', label: 'nav.home', route: '/c', exact: true },
    { icon: 'services', label: 'nav.services', route: '/c/services' },
    { icon: 'expert', label: 'nav.experts', route: '/c/providers' },
    { icon: 'heart', label: 'nav.favorites', route: '/c/favorites' },
    { icon: 'bell', label: 'nav.notifications', route: '/c/notifications' },
    { icon: 'support', label: 'nav.requests', route: '/c/requests' },
    { icon: 'profile', label: 'nav.account', route: '/c/account' },
    { icon: 'about', label: 'nav.about', route: '/c/about' },
  ];
}
