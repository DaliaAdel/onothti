import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';
import { LandingComponent } from './landing/landing.component';
import { opsPermissionGuard } from './ops/ops-permission.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: LandingComponent, canActivate: [guestGuard] },
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'login/phone',
    loadComponent: () => import('./auth/login-phone.component').then((m) => m.LoginPhoneComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'otp',
    loadComponent: () => import('./auth/otp.component').then((m) => m.OtpComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'login/password',
    loadComponent: () => import('./auth/login-password.component').then((m) => m.LoginPasswordComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'login/set-password',
    loadComponent: () => import('./auth/set-password.component').then((m) => m.SetPasswordComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'login/forgot',
    loadComponent: () => import('./auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'login/reset-password',
    loadComponent: () => import('./auth/reset-password.component').then((m) => m.ResetPasswordComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'complete',
    loadComponent: () => import('./auth/account-complete.component').then((m) => m.AccountCompleteComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/account-type.component').then((m) => m.AccountTypeComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'signup/phone',
    loadComponent: () => import('./auth/login-phone.component').then((m) => m.LoginPhoneComponent),
    canActivate: [guestGuard],
  },
  { path: 'signup/type', redirectTo: 'signup' },
  { path: 'signup/customer', redirectTo: 'signup' },
  { path: 'signup/provider', redirectTo: 'complete' },
  { path: 'p/login', redirectTo: 'login' },
  {
    path: 'legal/terms',
    loadComponent: () => import('./auth/legal.component').then((m) => m.LegalComponent),
    data: { kind: 'terms' },
  },
  {
    path: 'legal/policies',
    loadComponent: () => import('./auth/legal.component').then((m) => m.LegalComponent),
    data: { kind: 'policies' },
  },
  {
    path: 'legal/privacy',
    loadComponent: () => import('./auth/legal.component').then((m) => m.LegalComponent),
    data: { kind: 'privacy' },
  },
  {
    path: 'c',
    loadComponent: () => import('./layouts/customer-layout.component').then((m) => m.CustomerLayoutComponent),
    canActivate: [authGuard, roleGuard('CUSTOMER')],
    children: [
      {
        path: '',
        loadComponent: () => import('./customer/customer-dashboard.component').then((m) => m.CustomerDashboardComponent),
      },
      {
        path: 'services',
        loadComponent: () => import('./customer/customer-services.component').then((m) => m.CustomerServicesComponent),
      },
      {
        path: 'providers',
        loadComponent: () => import('./customer/provider-list.component').then((m) => m.ProviderListComponent),
      },
      {
        path: 'providers/:id',
        loadComponent: () => import('./customer/provider-profile.component').then((m) => m.ProviderProfileComponent),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./customer/customer-favorites.component').then((m) => m.CustomerFavoritesComponent),
      },
      {
        path: 'requests',
        loadComponent: () => import('./customer/customer-requests.component').then((m) => m.CustomerRequestsComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./provider/provider-notifications.component').then((m) => m.ProviderNotificationsComponent),
      },
      {
        path: 'account',
        loadComponent: () => import('./customer/customer-account.component').then((m) => m.CustomerAccountComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./customer/customer-about.component').then((m) => m.CustomerAboutComponent),
      },
    ],
  },
  {
    path: 'p',
    loadComponent: () => import('./layouts/provider-layout.component').then((m) => m.ProviderLayoutComponent),
    canActivate: [authGuard, roleGuard('PROVIDER')],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./provider/provider-dashboard.component').then((m) => m.ProviderDashboardComponent),
      },
      {
        path: 'services',
        loadComponent: () => import('./provider/provider-services.component').then((m) => m.ProviderServicesPageComponent),
      },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('./provider/provider-portfolio.component').then((m) => m.ProviderPortfolioPageComponent),
      },
      {
        path: 'reviews',
        loadComponent: () => import('./provider/provider-reviews.component').then((m) => m.ProviderReviewsPageComponent),
      },
      {
        path: 'views',
        loadComponent: () => import('./provider/provider-views.component').then((m) => m.ProviderViewsPageComponent),
      },
      {
        path: 'package',
        loadComponent: () => import('./provider/provider-package.component').then((m) => m.ProviderPackageComponent),
      },
      {
        path: 'payment',
        loadComponent: () => import('./provider/provider-payment.component').then((m) => m.ProviderPaymentComponent),
      },
      {
        path: 'payment-status',
        loadComponent: () =>
          import('./provider/provider-payment-status.component').then((m) => m.ProviderPaymentStatusComponent),
      },
      {
        path: 'support',
        loadComponent: () => import('./provider/provider-support.component').then((m) => m.ProviderSupportComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./provider/provider-notifications.component').then((m) => m.ProviderNotificationsComponent),
      },
      {
        path: 'account',
        loadComponent: () => import('./provider/provider-account.component').then((m) => m.ProviderAccountComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./provider/provider-about.component').then((m) => m.ProviderAboutComponent),
      },
    ],
  },
  {
    path: 'ops',
    loadComponent: () => import('./ops/ops-layout.component').then((m) => m.OpsLayoutComponent),
    canActivate: [authGuard, roleGuard('STAFF')],
    children: [
      { path: '', loadComponent: () => import('./ops/ops-dashboard.component').then((m) => m.OpsDashboardComponent) },
      {
        path: 'media',
        loadComponent: () => import('./ops/ops-approvals.component').then((m) => m.OpsApprovalsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'approvals' },
      },
      {
        path: 'approvals',
        loadComponent: () => import('./ops/ops-approvals.component').then((m) => m.OpsApprovalsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'approvals' },
      },
      {
        path: 'accounts',
        loadComponent: () => import('./ops/ops-approvals.component').then((m) => m.OpsApprovalsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'approvals' },
      },
      {
        path: 'clients',
        loadComponent: () => import('./ops/ops-clients.component').then((m) => m.OpsClientsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'clients' },
      },
      {
        path: 'reviews',
        loadComponent: () => import('./ops/ops-reviews.component').then((m) => m.OpsReviewsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'reviews' },
      },
      {
        path: 'packages/:id/services',
        redirectTo: '/ops/packages/:id',
        pathMatch: 'full',
      },
      {
        path: 'packages/:id',
        loadComponent: () =>
          import('./ops/ops-package-services.component').then((m) => m.OpsPackageServicesComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'packages' },
      },
      {
        path: 'packages',
        loadComponent: () => import('./ops/ops-packages.component').then((m) => m.OpsPackagesComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'packages' },
      },
      {
        path: 'geo',
        loadComponent: () => import('./ops/ops-geo.component').then((m) => m.OpsGeoComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'geo' },
      },
      {
        path: 'settings',
        loadComponent: () => import('./ops/ops-settings.component').then((m) => m.OpsSettingsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'settings' },
      },
      {
        path: 'notices',
        loadComponent: () => import('./ops/ops-notices.component').then((m) => m.OpsNoticesComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'notices' },
      },
      {
        path: 'staff',
        loadComponent: () => import('./ops/ops-staff.component').then((m) => m.OpsStaffComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'staff' },
      },
      {
        path: 'permissions/staff/:id',
        loadComponent: () => import('./ops/ops-permissions.component').then((m) => m.OpsPermissionsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'permissions' },
      },
      {
        path: 'permissions',
        loadComponent: () => import('./ops/ops-permissions.component').then((m) => m.OpsPermissionsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'permissions' },
      },
      {
        path: 'org',
        loadComponent: () => import('./ops/ops-org.component').then((m) => m.OpsOrgComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'org' },
      },
      {
        path: 'legal',
        loadComponent: () => import('./ops/ops-legal.component').then((m) => m.OpsLegalComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'legal' },
      },
      {
        path: 'catalog',
        loadComponent: () => import('./ops/ops-catalog.component').then((m) => m.OpsCatalogComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'catalog' },
      },
      {
        path: 'tickets',
        loadComponent: () => import('./ops/ops-tickets.component').then((m) => m.OpsTicketsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'tickets' },
      },
      {
        path: 'events',
        loadComponent: () => import('./ops/ops-events.component').then((m) => m.OpsEventsComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'events' },
      },
      {
        path: 'activity',
        loadComponent: () => import('./ops/ops-activity.component').then((m) => m.OpsActivityComponent),
        canActivate: [opsPermissionGuard],
        data: { opsPage: 'activity' },
      },
      { path: 'notifications', loadComponent: () => import('./ops/ops-notifications.component').then((m) => m.OpsNotificationsComponent) },
      { path: 'profile', loadComponent: () => import('./ops/ops-profile.component').then((m) => m.OpsProfileComponent) },
      { path: 'about', loadComponent: () => import('./ops/ops-about.component').then((m) => m.OpsAboutComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
