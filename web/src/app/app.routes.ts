import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';
import { LoginComponent } from './auth/login.component';
import { LoginPhoneComponent } from './auth/login-phone.component';
import { OtpComponent } from './auth/otp.component';
import { AccountCompleteComponent } from './auth/account-complete.component';
import { AccountTypeComponent } from './auth/account-type.component';
import { LegalComponent } from './auth/legal.component';
import { CustomerLayoutComponent } from './layouts/customer-layout.component';
import { ProviderLayoutComponent } from './layouts/provider-layout.component';
import { CustomerDashboardComponent } from './customer/customer-dashboard.component';
import { CustomerServicesComponent } from './customer/customer-services.component';
import { ProviderListComponent } from './customer/provider-list.component';
import { ProviderProfileComponent } from './customer/provider-profile.component';
import { CustomerFavoritesComponent } from './customer/customer-favorites.component';
import { CustomerAccountComponent } from './customer/customer-account.component';
import { ProviderDashboardComponent } from './provider/provider-dashboard.component';
import { ProviderAccountComponent } from './provider/provider-account.component';
import { ProviderPackageComponent } from './provider/provider-package.component';
import { ProviderPaymentComponent } from './provider/provider-payment.component';
import { ProviderServicesPageComponent } from './provider/provider-services.component';
import { ProviderPortfolioPageComponent } from './provider/provider-portfolio.component';
import { ProviderReviewsPageComponent } from './provider/provider-reviews.component';
import { ProviderViewsPageComponent } from './provider/provider-views.component';
import { ProviderSupportComponent } from './provider/provider-support.component';
import { ProviderNotificationsComponent } from './provider/provider-notifications.component';
import { ProviderPaymentStatusComponent } from './provider/provider-payment-status.component';
import { ComingSoonComponent } from './shared/coming-soon.component';
import { OpsLayoutComponent } from './ops/ops-layout.component';
import { OpsDashboardComponent } from './ops/ops-dashboard.component';
import { OpsMediaComponent } from './ops/ops-media.component';
import { OpsAccountsComponent } from './ops/ops-accounts.component';
import { OpsPackagesComponent } from './ops/ops-packages.component';
import { OpsReviewsComponent } from './ops/ops-reviews.component';
import { OpsGeoComponent } from './ops/ops-geo.component';
import { OpsSettingsComponent } from './ops/ops-settings.component';
import { OpsStaffComponent } from './ops/ops-staff.component';
import { OpsLegalComponent } from './ops/ops-legal.component';
import { OpsCatalogComponent } from './ops/ops-catalog.component';
import { OpsTicketsComponent } from './ops/ops-tickets.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'login/phone', component: LoginPhoneComponent, canActivate: [guestGuard] },
  { path: 'otp', component: OtpComponent, canActivate: [guestGuard] },
  { path: 'complete', component: AccountCompleteComponent, canActivate: [guestGuard] },
  { path: 'signup', component: AccountTypeComponent, canActivate: [guestGuard] },
  { path: 'signup/phone', component: LoginPhoneComponent, canActivate: [guestGuard] },
  { path: 'signup/type', redirectTo: 'signup' },
  { path: 'signup/customer', redirectTo: 'signup' },
  { path: 'signup/provider', redirectTo: 'complete' },
  { path: 'p/login', redirectTo: 'login' },
  { path: 'legal/terms', component: LegalComponent, data: { kind: 'terms' } },
  { path: 'legal/policies', component: LegalComponent, data: { kind: 'policies' } },
  {
    path: 'c',
    component: CustomerLayoutComponent,
    canActivate: [authGuard, roleGuard('CUSTOMER')],
    children: [
      { path: '', component: CustomerDashboardComponent },
      { path: 'services', component: CustomerServicesComponent },
      { path: 'providers', component: ProviderListComponent },
      { path: 'providers/:id', component: ProviderProfileComponent },
      { path: 'favorites', component: CustomerFavoritesComponent },
      {
        path: 'requests',
        component: ComingSoonComponent,
        data: {
          title: 'طلباتي',
          subtitle: 'متابعة الطلبات لاحقًا',
          heading: 'الطلبات خارج نطاق النسخة الحالية',
          message: 'في النسخة الأولى التواصل يتم عبر واتساب خارج المنصة.',
        },
      },
      {
        path: 'notifications',
        component: ComingSoonComponent,
        data: {
          title: 'الإشعارات',
          subtitle: 'تنبيهات حسابك',
          heading: 'الإشعارات قادمة',
          message: 'سنظهر هنا تنبيهات المراجعة والتقييمات والتواصل.',
        },
      },
      { path: 'account', component: CustomerAccountComponent },
    ],
  },
  {
    path: 'p',
    component: ProviderLayoutComponent,
    canActivate: [authGuard, roleGuard('PROVIDER')],
    children: [
      { path: '', component: ProviderDashboardComponent },
      { path: 'services', component: ProviderServicesPageComponent },
      { path: 'portfolio', component: ProviderPortfolioPageComponent },
      { path: 'reviews', component: ProviderReviewsPageComponent },
      { path: 'views', component: ProviderViewsPageComponent },
      { path: 'package', component: ProviderPackageComponent },
      { path: 'payment', component: ProviderPaymentComponent },
      { path: 'payment-status', component: ProviderPaymentStatusComponent },
      { path: 'support', component: ProviderSupportComponent },
      { path: 'notifications', component: ProviderNotificationsComponent },
      { path: 'account', component: ProviderAccountComponent },
    ],
  },
  {
    path: 'ops',
    component: OpsLayoutComponent,
    canActivate: [authGuard, roleGuard('STAFF')],
    children: [
      { path: '', component: OpsDashboardComponent },
      { path: 'media', component: OpsMediaComponent },
      { path: 'accounts', component: OpsAccountsComponent },
      { path: 'reviews', component: OpsReviewsComponent },
      { path: 'packages', component: OpsPackagesComponent },
      { path: 'geo', component: OpsGeoComponent },
      { path: 'settings', component: OpsSettingsComponent },
      { path: 'staff', component: OpsStaffComponent },
      { path: 'legal', component: OpsLegalComponent },
      { path: 'catalog', component: OpsCatalogComponent },
      { path: 'tickets', component: OpsTicketsComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
