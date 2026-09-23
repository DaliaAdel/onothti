import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';
import { LoginComponent } from './auth/login.component';
import { OtpComponent } from './auth/otp.component';
import { SignupComponent } from './auth/signup.component';
import { AccountTypeComponent } from './auth/account-type.component';
import { SignupCustomerComponent } from './auth/signup-customer.component';
import { SignupProviderComponent } from './auth/signup-provider.component';
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
import { ComingSoonComponent } from './shared/coming-soon.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'otp', component: OtpComponent },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },
  { path: 'signup/type', component: AccountTypeComponent, canActivate: [guestGuard] },
  { path: 'signup/customer', component: SignupCustomerComponent, canActivate: [guestGuard] },
  { path: 'signup/provider', component: SignupProviderComponent, canActivate: [guestGuard] },
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
      { path: 'support', component: ProviderSupportComponent },
      { path: 'account', component: ProviderAccountComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
