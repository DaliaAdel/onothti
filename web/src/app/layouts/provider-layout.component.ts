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
    { icon: 'home', label: 'الرئيسية', route: '/p', exact: true },
    { icon: 'spark', label: 'خدماتي', route: '/p/services' },
    { icon: 'image', label: 'ألبومات أعمالي', route: '/p/portfolio' },
    { icon: 'star', label: 'تقييماتي', route: '/p/reviews' },
    { icon: 'eye', label: 'المشاهدات', route: '/p/views' },
    { icon: 'diamond', label: 'باقتي', route: '/p/package' },
    { icon: 'help', label: 'الدعم والصيانة', route: '/p/support' },
    { icon: 'user', label: 'حسابي', route: '/p/account' },
  ];
}
