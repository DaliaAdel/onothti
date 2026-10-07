import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import type {
  AuthResponse,
  CatalogCity,
  CatalogPackage,
  CatalogRegion,
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
  OpsDashboard,
  OpsMediaItem,
  OpsPendingProvider,
  OpsCampaign,
  OpsRating,
  OpsComplaint,
  OpsProfileChange,
  OpsRegion,
  OpsCity,
  OpsSetting,
  OpsWelcome,
  OpsRole,
  OpsStaff,
  OpsPermission,
  OpsLegalPage,
  OpsCatalogService,
  OpsSubService,
  OpsTicket,
  OpsBankAccount,
  OpsBannedPhone,
  OpsCoverage,
  OpsManagedAccount,
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
    cityIds?: string[];
    email?: string;
    acceptTerms: boolean;
  }) {
    return this.http.post<AuthResponse>(`${this.base}/auth/phone/complete`, {
      ...body,
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

  regions() {
    return this.http.get<CatalogRegion[]>(`${this.base}/catalog/regions`);
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

  updateProviderProfile(body: {
    displayName?: string;
    cityId?: string;
    cityIds?: string[];
    bio?: string;
    whatsapp?: string;
  }) {
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

  customerTicketTypes() {
    return this.http.get<TicketType[]>(`${this.base}/customer/ticket-types`);
  }

  customerTickets() {
    return this.http.get<ProviderTicket[]>(`${this.base}/customer/tickets`);
  }

  createCustomerTicket(body: { typeCode: string; body: string }) {
    return this.http.post<ProviderTicket>(`${this.base}/customer/tickets`, body);
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

  opsDashboard() {
    return this.http.get<OpsDashboard>(`${this.base}/ops/dashboard`);
  }

  opsMedia(query: { status?: string; kind?: string; purpose?: string; accountType?: string } = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<OpsMediaItem[]>(`${this.base}/ops/media`, { params });
  }

  opsReviewMedia(
    id: string,
    body: { approve?: boolean; requestClearer?: boolean; note?: string; startAt?: string; endAt?: string },
  ) {
    return this.http.post<OpsMediaItem>(`${this.base}/ops/media/${id}/review`, body);
  }

  opsPendingProviders() {
    return this.http.get<OpsPendingProvider[]>(`${this.base}/ops/providers/pending`);
  }

  opsReviewProvider(id: string, approve: boolean, reason?: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/ops/providers/${id}/review`, { approve, reason });
  }

  opsPackages() {
    return this.http.get<CatalogPackage[]>(`${this.base}/ops/packages`);
  }

  opsCreatePackage(body: Partial<CatalogPackage> & { code: string; nameAr: string; durationMonths: number; price: number; rank: number }) {
    return this.http.post<CatalogPackage>(`${this.base}/ops/packages`, body);
  }

  opsPatchPackage(id: string, body: Partial<CatalogPackage>) {
    return this.http.patch<CatalogPackage>(`${this.base}/ops/packages/${id}`, body);
  }

  opsCampaigns() {
    return this.http.get<OpsCampaign[]>(`${this.base}/ops/campaigns`);
  }

  opsCreateCampaign(body: {
    nameAr: string;
    nameEn?: string;
    startDate: string;
    endDate: string;
    benefitDays: number;
    isActive?: boolean;
  }) {
    return this.http.post<OpsCampaign>(`${this.base}/ops/campaigns`, body);
  }

  opsPatchCampaign(id: string, body: Partial<OpsCampaign>) {
    return this.http.patch<OpsCampaign>(`${this.base}/ops/campaigns/${id}`, body);
  }

  opsRatings(status = 'PENDING') {
    return this.http.get<OpsRating[]>(`${this.base}/ops/ratings`, { params: { status } });
  }

  opsReviewRating(id: string, approve: boolean, note?: string) {
    return this.http.post<OpsRating>(`${this.base}/ops/ratings/${id}/review`, { approve, note });
  }

  opsComplaints(status?: string) {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<OpsComplaint[]>(`${this.base}/ops/complaints`, { params });
  }

  opsPatchComplaint(id: string, status: 'OPEN' | 'CLOSED' | 'ESCALATED', note?: string) {
    return this.http.patch<OpsComplaint>(`${this.base}/ops/complaints/${id}`, { status, note });
  }

  opsProfileChanges(status = 'PENDING') {
    return this.http.get<OpsProfileChange[]>(`${this.base}/ops/profile-changes`, { params: { status } });
  }

  opsReviewChange(id: string, approve: boolean) {
    return this.http.post<OpsProfileChange>(`${this.base}/ops/profile-changes/${id}/review`, { approve });
  }

  opsRegions() {
    return this.http.get<OpsRegion[]>(`${this.base}/ops/regions`);
  }

  opsCreateRegion(body: { code: string; nameAr: string; nameEn?: string; isVisible?: boolean; sortOrder?: number }) {
    return this.http.post<OpsRegion>(`${this.base}/ops/regions`, body);
  }

  opsPatchRegion(id: string, body: Partial<Pick<OpsRegion, 'nameAr' | 'nameEn' | 'isVisible' | 'sortOrder'>>) {
    return this.http.patch<OpsRegion>(`${this.base}/ops/regions/${id}`, body);
  }

  opsCreateCity(body: { regionId: string; code: string; nameAr: string; nameEn?: string; isVisible?: boolean }) {
    return this.http.post<OpsCity>(`${this.base}/ops/cities`, body);
  }

  opsPatchCity(id: string, body: Partial<Pick<OpsCity, 'regionId' | 'nameAr' | 'nameEn' | 'isVisible'>>) {
    return this.http.patch<OpsCity>(`${this.base}/ops/cities/${id}`, body);
  }

  opsMe() {
    return this.http.get<OpsStaff>(`${this.base}/ops/me`);
  }

  opsSettings() {
    return this.http.get<OpsSetting[]>(`${this.base}/ops/settings`);
  }

  opsPatchSetting(key: string, value: string) {
    return this.http.patch<OpsSetting>(`${this.base}/ops/settings`, { key, value });
  }

  opsWelcome() {
    return this.http.get<OpsWelcome[]>(`${this.base}/ops/welcome-messages`);
  }

  opsCreateWelcome(body: { audience: string; kind: string; bodyAr: string; bodyEn?: string; isActive?: boolean }) {
    return this.http.post<OpsWelcome>(`${this.base}/ops/welcome-messages`, body);
  }

  opsPatchWelcome(id: string, body: Partial<OpsWelcome>) {
    return this.http.patch<OpsWelcome>(`${this.base}/ops/welcome-messages/${id}`, body);
  }

  opsRoles() {
    return this.http.get<OpsRole[]>(`${this.base}/ops/roles`);
  }

  opsStaff() {
    return this.http.get<OpsStaff[]>(`${this.base}/ops/staff`);
  }

  opsCreateStaff(body: { mobile: string; displayName: string; roleId: string; team?: string }) {
    return this.http.post<OpsStaff>(`${this.base}/ops/staff`, body);
  }

  opsPatchStaff(id: string, body: { displayName?: string; roleId?: string; status?: 'ACTIVE' | 'SUSPENDED'; team?: string }) {
    return this.http.patch<OpsStaff>(`${this.base}/ops/staff/${id}`, body);
  }

  opsPermissions() {
    return this.http.get<OpsPermission[]>(`${this.base}/ops/permissions`);
  }

  opsPatchRolePermissions(id: string, permissionCodes: string[]) {
    return this.http.patch<OpsRole>(`${this.base}/ops/roles/${id}/permissions`, { permissionCodes });
  }

  opsLegal() {
    return this.http.get<OpsLegalPage[]>(`${this.base}/ops/legal`);
  }

  opsPatchLegal(id: string, body: { titleAr: string; bodyAr: string; titleEn?: string; bodyEn?: string }) {
    return this.http.patch<OpsLegalPage>(`${this.base}/ops/legal/${id}`, body);
  }

  opsCatalog() {
    return this.http.get<OpsCatalogService[]>(`${this.base}/ops/catalog`);
  }

  opsCreateService(body: { code: string; nameAr: string; nameEn?: string; sortOrder?: number; isVisible?: boolean }) {
    return this.http.post<OpsCatalogService>(`${this.base}/ops/catalog`, body);
  }

  opsPatchService(id: string, body: Partial<Pick<OpsCatalogService, 'nameAr' | 'nameEn' | 'sortOrder' | 'isVisible'>>) {
    return this.http.patch<OpsCatalogService>(`${this.base}/ops/catalog/${id}`, body);
  }

  opsCreateSubService(serviceId: string, body: { code: string; nameAr: string; nameEn?: string; sortOrder?: number }) {
    return this.http.post<OpsSubService>(`${this.base}/ops/catalog/${serviceId}/sub-services`, body);
  }

  opsPatchSubService(id: string, body: Partial<Pick<OpsSubService, 'nameAr' | 'nameEn' | 'sortOrder' | 'isVisible'>>) {
    return this.http.patch<OpsSubService>(`${this.base}/ops/sub-services/${id}`, body);
  }

  opsTickets(status?: string) {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<OpsTicket[]>(`${this.base}/ops/tickets`, { params });
  }

  opsPatchTicket(id: string, status: 'SENT' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') {
    return this.http.patch<OpsTicket>(`${this.base}/ops/tickets/${id}`, { status });
  }

  opsCommentTicket(id: string, body: string) {
    return this.http.post<OpsTicket>(`${this.base}/ops/tickets/${id}/comments`, { body });
  }

  opsBankAccounts() {
    return this.http.get<OpsBankAccount[]>(`${this.base}/ops/bank-accounts`);
  }

  opsCreateBank(body: { bankName: string; iban: string; accountName: string; isActive?: boolean }) {
    return this.http.post<OpsBankAccount>(`${this.base}/ops/bank-accounts`, body);
  }

  opsPatchBank(id: string, body: Partial<OpsBankAccount>) {
    return this.http.patch<OpsBankAccount>(`${this.base}/ops/bank-accounts/${id}`, body);
  }

  opsBannedPhones() {
    return this.http.get<OpsBannedPhone[]>(`${this.base}/ops/banned-phones`);
  }

  opsBanPhone(body: { mobile: string; reason: string }) {
    return this.http.post<OpsBannedPhone>(`${this.base}/ops/banned-phones`, body);
  }

  opsUnbanPhone(mobile: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/ops/banned-phones/${mobile}/lift`, {});
  }

  opsCreateCoverage(body: { cityId: string; code: string; nameAr: string; nameEn?: string; isVisible?: boolean }) {
    return this.http.post<OpsCoverage>(`${this.base}/ops/coverage`, body);
  }

  opsPatchCoverage(id: string, body: Partial<Pick<OpsCoverage, 'nameAr' | 'nameEn' | 'isVisible'>>) {
    return this.http.patch<OpsCoverage>(`${this.base}/ops/coverage/${id}`, body);
  }

  opsAccounts(query: { q?: string; accountType?: string; status?: string } = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<OpsManagedAccount[]>(`${this.base}/ops/accounts`, { params });
  }

  opsPatchAccount(id: string, body: { status: string; reason?: string; visibility?: string }) {
    return this.http.patch<OpsManagedAccount>(`${this.base}/ops/accounts/${id}`, body);
  }

  opsBroadcast(body: { audience: 'CUSTOMER' | 'PROVIDER' | 'ALL'; titleAr: string; bodyAr: string }) {
    return this.http.post<{ sent: number }>(`${this.base}/ops/broadcast`, body);
  }
}
