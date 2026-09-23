import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import type {
  AuthResponse,
  CatalogCity,
  CatalogPackage,
  CatalogService,
  FavoriteList,
  PaymentProof,
  ProviderDashboard,
  ProviderMe,
  ProviderPortfolioItem,
  ProviderProfile,
  ProviderReviews,
  ProviderServiceRow,
  ProviderSubscriptionResponse,
  ProviderTicket,
  ProviderViews,
  SearchResponse,
  SessionUser,
  TicketType,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  login(mobile: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, { mobile, password });
  }

  register(body: {
    accountType: 'CUSTOMER' | 'PROVIDER';
    displayName: string;
    mobile: string;
    password: string;
    email?: string;
  }) {
    return this.http.post<{ userId: string; accountCode: string; status: string }>(
      `${this.base}/auth/register`,
      body,
    );
  }

  sendOtp(mobile: string, purpose: 'REGISTER' | 'LOGIN_NEW_DEVICE' | 'RESET_PASSWORD' | 'FIRST_BROWSER') {
    return this.http.post<{ otpExpiresIn: number }>(`${this.base}/auth/otp/send`, { mobile, purpose });
  }

  verifyOtp(
    mobile: string,
    purpose: 'REGISTER' | 'LOGIN_NEW_DEVICE' | 'RESET_PASSWORD' | 'FIRST_BROWSER',
    code: string,
  ) {
    return this.http.post<{ verified: boolean }>(`${this.base}/auth/otp/verify`, {
      mobile,
      purpose,
      code,
    });
  }

  me() {
    return this.http.get<SessionUser>(`${this.base}/auth/me`);
  }

  cities() {
    return this.http.get<CatalogCity[]>(`${this.base}/catalog/cities`);
  }

  services() {
    return this.http.get<CatalogService[]>(`${this.base}/catalog/services`);
  }

  packages() {
    return this.http.get<CatalogPackage[]>(`${this.base}/catalog/packages`);
  }

  search(query: Record<string, string | number | undefined>) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<SearchResponse>(`${this.base}/search`, { params });
  }

  provider(id: string) {
    return this.http.get<ProviderProfile>(`${this.base}/providers/${id}`);
  }

  whatsapp(id: string) {
    return this.http.post<{ phone: string; url: string; disclaimerAr: string }>(
      `${this.base}/providers/${id}/whatsapp`,
      {},
    );
  }

  rate(id: string, stars: number, note?: string) {
    return this.http.post(`${this.base}/providers/${id}/ratings`, { stars, note });
  }

  customerProfile() {
    return this.http.get<SessionUser>(`${this.base}/customer/profile`);
  }

  updateCustomerProfile(body: { displayName?: string; cityId?: string }) {
    return this.http.patch<SessionUser>(`${this.base}/customer/profile`, body);
  }

  favorites() {
    return this.http.get<FavoriteList>(`${this.base}/customer/favorites`);
  }

  addFavorite(targetType: 'PROVIDER' | 'SERVICE', targetId: string) {
    return this.http.post(`${this.base}/customer/favorites`, { targetType, targetId });
  }

  removeFavorite(targetType: 'PROVIDER' | 'SERVICE', targetId: string) {
    return this.http.delete(`${this.base}/customer/favorites`, { body: { targetType, targetId } });
  }

  providerProfile() {
    return this.http.get<ProviderMe>(`${this.base}/provider/profile`);
  }

  updateProviderProfile(body: { displayName?: string; cityId?: string; bio?: string; whatsapp?: string }) {
    return this.http.patch<ProviderMe>(`${this.base}/provider/profile`, body);
  }

  uploadProviderAvatar(file: File) {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<ProviderMe>(`${this.base}/provider/avatar`, data);
  }

  providerDashboard() {
    return this.http.get<ProviderDashboard>(`${this.base}/provider/dashboard`);
  }

  providerServices() {
    return this.http.get<ProviderServiceRow[]>(`${this.base}/provider/services`);
  }

  addProviderService(body: { serviceId: string; subServiceId?: string }) {
    return this.http.post<ProviderServiceRow>(`${this.base}/provider/services`, body);
  }

  removeProviderService(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/provider/services/${id}`);
  }

  providerPortfolio() {
    return this.http.get<ProviderPortfolioItem[]>(`${this.base}/provider/portfolio`);
  }

  addProviderPortfolio(file: File, kind: 'IMAGE' | 'VIDEO') {
    const data = new FormData();
    data.append('file', file);
    data.append('kind', kind);
    return this.http.post<ProviderPortfolioItem>(`${this.base}/provider/portfolio`, data);
  }

  removeProviderPortfolio(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/provider/portfolio/${id}`);
  }

  providerReviews() {
    return this.http.get<ProviderReviews>(`${this.base}/provider/reviews`);
  }

  providerViews() {
    return this.http.get<ProviderViews>(`${this.base}/provider/views`);
  }

  providerSubscription() {
    return this.http.get<ProviderSubscriptionResponse>(`${this.base}/provider/subscription`);
  }

  submitPaymentProof(body: {
    packageId: string;
    amount?: number;
    transferText?: string;
    storageKey?: string;
    mime?: string;
    kind?: 'IMAGE' | 'PDF' | 'TEXT';
    sizeBytes?: number;
  }) {
    return this.http.post<PaymentProof>(`${this.base}/provider/payment-proofs`, body);
  }

  ticketTypes() {
    return this.http.get<TicketType[]>(`${this.base}/provider/ticket-types`);
  }

  providerTickets() {
    return this.http.get<ProviderTicket[]>(`${this.base}/provider/tickets`);
  }

  createProviderTicket(body: { typeCode: string; body: string }) {
    return this.http.post<ProviderTicket>(`${this.base}/provider/tickets`, body);
  }

  terms(audience: 'CUSTOMER' | 'PROVIDER') {
    return this.http.get<{ titleAr?: string; bodyAr?: string; contentAr?: string }>(
      `${this.base}/legal/terms`,
      { params: { audience } },
    );
  }

  policies(audience: 'CUSTOMER' | 'PROVIDER') {
    return this.http.get<{ titleAr?: string; bodyAr?: string; contentAr?: string }>(
      `${this.base}/legal/policies`,
      { params: { audience } },
    );
  }
}
