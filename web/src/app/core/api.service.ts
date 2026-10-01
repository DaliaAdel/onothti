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
  PhoneAuthResponse,
  AppNotification,
  ProviderDashboard,
  ProviderMe,
  ProviderAlbum,
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

import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly base = environment.apiUrl;

  private deviceId() {
    return this.session.deviceId();
  }

  login(mobile: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, { mobile, password });
  }

  startPhone(mobile: string) {
    return this.http.post<PhoneAuthResponse>(`${this.base}/auth/phone/start`, {
      mobile,
      deviceId: this.deviceId(),
      channel: 'WEB',
    });
  }

  verifyPhone(mobile: string, code: string) {
    return this.http.post<PhoneAuthResponse>(`${this.base}/auth/phone/verify`, {
      mobile,
      code,
      deviceId: this.deviceId(),
      channel: 'WEB',
    });
  }

  completePhone(body: {
    mobile: string;
    code: string;
    accountType: 'CUSTOMER' | 'PROVIDER';
    displayName: string;
    cityId: string;
    email?: string;
  }) {
    return this.http.post<AuthResponse>(`${this.base}/auth/phone/complete`, {
      ...body,
      acceptTerms: true,
      deviceId: this.deviceId(),
      channel: 'WEB',
    });
  }

  logout() {
    return this.http.post<{ ok: boolean }>(`${this.base}/auth/logout`, {
      deviceId: this.deviceId(),
    });
  }

  register(body: {
    accountType: 'CUSTOMER' | 'PROVIDER';
    displayName: string;
    mobile: string;
    password?: string;
    email?: string;
  }) {
    return this.http.post<{ userId: string; accountCode: string; status: string }>(
      `${this.base}/auth/register`,
      { ...body, acceptTerms: true },
    );
  }

  sendOtp(mobile: string, purpose: 'REGISTER' | 'LOGIN' | 'LOGIN_NEW_DEVICE' | 'RESET_PASSWORD' | 'FIRST_BROWSER') {
    return this.http.post<{ otpExpiresIn: number }>(`${this.base}/auth/otp/send`, { mobile, purpose });
  }

  verifyOtp(
    mobile: string,
    purpose: 'REGISTER' | 'LOGIN' | 'LOGIN_NEW_DEVICE' | 'RESET_PASSWORD' | 'FIRST_BROWSER',
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

  reorderProviderServices(ids: string[]) {
    return this.http.put<ProviderServiceRow[]>(`${this.base}/provider/services/order`, { ids });
  }

  patchProviderService(id: string, body: { isActive?: boolean; isPrimary?: boolean }) {
    return this.http.patch<ProviderServiceRow>(`${this.base}/provider/services/${id}`, body);
  }

  removeProviderService(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/provider/services/${id}`);
  }

  providerPortfolio(albumId?: string) {
    const params = albumId ? `?albumId=${encodeURIComponent(albumId)}` : '';
    return this.http.get<ProviderPortfolioItem[]>(`${this.base}/provider/portfolio${params}`);
  }

  providerAlbums() {
    return this.http.get<ProviderAlbum[]>(`${this.base}/provider/albums`);
  }

  createProviderAlbum(name: string) {
    return this.http.post<ProviderAlbum>(`${this.base}/provider/albums`, { name });
  }

  providerAlbum(id: string) {
    return this.http.get<{ album: ProviderAlbum; items: ProviderPortfolioItem[] }>(`${this.base}/provider/albums/${id}`);
  }

  patchProviderAlbum(id: string, body: { name?: string; isActive?: boolean }) {
    return this.http.patch<ProviderAlbum>(`${this.base}/provider/albums/${id}`, body);
  }

  removeProviderAlbum(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/provider/albums/${id}`);
  }

  addProviderPortfolio(file: File, kind: 'IMAGE' | 'VIDEO', albumId?: string) {
    const data = new FormData();
    data.append('file', file);
    data.append('kind', kind);
    if (albumId && albumId !== 'unfiled') {
      data.append('albumId', albumId);
    }
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
    reference?: string;
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

  notifications() {
    return this.http.get<AppNotification[]>(`${this.base}/notifications`);
  }

  readNotification(id: string) {
    return this.http.patch<{ ok: boolean }>(`${this.base}/notifications/${id}/read`, {});
  }

  readAllNotifications() {
    return this.http.post<{ ok: boolean }>(`${this.base}/notifications/read-all`, {});
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
