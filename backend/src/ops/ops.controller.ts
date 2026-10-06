import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth-user";
import { StaffGuard, PermissionGuard, RequirePermission } from "./ops.guard";
import { OpsService } from "./ops.service";
import {
  CreateCampaignDto,
  CreateCityDto,
  CreateStaffDto,
  PatchCampaignDto,
  PatchCityDto,
  PatchPackageDto,
  PatchRegionDto,
  PatchStaffDto,
  ReviewChangeDto,
  ReviewMediaDto,
  ReviewProviderDto,
  UpdateSettingDto,
  UpsertPackageDto,
  UpsertRegionDto,
  UpsertWelcomeDto,
  ReviewRatingDto,
  PatchComplaintDto,
  PatchRolePermissionsDto,
  PatchLegalDto,
  UpsertServiceDto,
  PatchServiceDto,
  UpsertSubServiceDto,
  PatchSubServiceDto,
  UpsertCoverageDto,
  PatchCoverageDto,
  UpsertBankDto,
  PatchBankDto,
  CreateBannedPhoneDto,
  PatchTicketDto,
  CreateTicketCommentDto,
  PatchAccountDto,
  BroadcastDto,
} from "./dto/ops.dto";
import { StaffPermission } from "../common/enums";

@ApiTags("ops")
@ApiBearerAuth()
@UseGuards(StaffGuard, PermissionGuard)
@Controller("ops")
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.ops.me(user.sub);
  }

  @Get("dashboard")
  @RequirePermission(StaffPermission.REPORTS_VIEW)
  dashboard() {
    return this.ops.dashboard();
  }

  @Get("media")
  @RequirePermission(StaffPermission.MEDIA_REVIEW, StaffPermission.PAYMENTS_REVIEW)
  media(
    @Query("status") status?: string,
    @Query("kind") kind?: string,
    @Query("purpose") purpose?: string,
    @Query("accountType") accountType?: string,
  ) {
    return this.ops.media({ status, kind, purpose, accountType });
  }

  @Post("media/:id/review")
  @RequirePermission(StaffPermission.MEDIA_REVIEW, StaffPermission.PAYMENTS_REVIEW)
  reviewMedia(
    @Param("id") id: string,
    @Body() dto: ReviewMediaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.reviewMedia(id, dto, user.sub);
  }

  @Get("providers/pending")
  @RequirePermission(StaffPermission.PROVIDERS_APPROVE)
  pendingProviders() {
    return this.ops.pendingProviders();
  }

  @Post("providers/:id/review")
  @RequirePermission(StaffPermission.PROVIDERS_APPROVE)
  reviewProvider(
    @Param("id") id: string,
    @Body() dto: ReviewProviderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.reviewProvider(id, dto, user.sub);
  }

  @Get("packages")
  @RequirePermission(StaffPermission.PACKAGES_MANAGE)
  packages() {
    return this.ops.packages();
  }

  @Post("packages")
  @RequirePermission(StaffPermission.PACKAGES_MANAGE)
  createPackage(@Body() dto: UpsertPackageDto) {
    return this.ops.createPackage(dto);
  }

  @Patch("packages/:id")
  @RequirePermission(StaffPermission.PACKAGES_MANAGE)
  patchPackage(@Param("id") id: string, @Body() dto: PatchPackageDto) {
    return this.ops.patchPackage(id, dto);
  }

  @Get("settings")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE)
  settings() {
    return this.ops.settings();
  }

  @Patch("settings")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE)
  upsertSetting(@Body() dto: UpdateSettingDto) {
    return this.ops.upsertSetting(dto);
  }

  @Get("campaigns")
  @RequirePermission(StaffPermission.PACKAGES_MANAGE)
  campaigns() {
    return this.ops.campaigns();
  }

  @Post("campaigns")
  @RequirePermission(StaffPermission.PACKAGES_MANAGE)
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.ops.createCampaign(dto);
  }

  @Patch("campaigns/:id")
  @RequirePermission(StaffPermission.PACKAGES_MANAGE)
  patchCampaign(@Param("id") id: string, @Body() dto: PatchCampaignDto) {
    return this.ops.patchCampaign(id, dto);
  }

  @Get("welcome-messages")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE)
  welcomeMessages() {
    return this.ops.welcomeMessages();
  }

  @Post("welcome-messages")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE)
  createWelcome(@Body() dto: UpsertWelcomeDto) {
    return this.ops.createWelcome(dto);
  }

  @Patch("welcome-messages/:id")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE)
  patchWelcome(@Param("id") id: string, @Body() dto: UpsertWelcomeDto) {
    return this.ops.patchWelcome(id, dto);
  }

  @Get("profile-changes")
  @RequirePermission(StaffPermission.RATINGS_REVIEW)
  profileChanges(@Query("status") status?: string) {
    return this.ops.profileChanges(status);
  }

  @Post("profile-changes/:id/review")
  @RequirePermission(StaffPermission.RATINGS_REVIEW)
  reviewChange(@Param("id") id: string, @Body() dto: ReviewChangeDto) {
    return this.ops.reviewChange(id, dto.approve !== false);
  }

  @Get("ratings")
  @RequirePermission(StaffPermission.RATINGS_REVIEW)
  ratings(@Query("status") status?: string) {
    return this.ops.ratings(status);
  }

  @Post("ratings/:id/review")
  @RequirePermission(StaffPermission.RATINGS_REVIEW)
  reviewRating(@Param("id") id: string, @Body() dto: ReviewRatingDto) {
    return this.ops.reviewRating(id, dto);
  }

  @Get("complaints")
  @RequirePermission(StaffPermission.RATINGS_REVIEW, StaffPermission.TICKETS_MANAGE)
  complaints(@Query("status") status?: string) {
    return this.ops.complaints(status);
  }

  @Patch("complaints/:id")
  @RequirePermission(StaffPermission.RATINGS_REVIEW, StaffPermission.TICKETS_MANAGE)
  patchComplaint(@Param("id") id: string, @Body() dto: PatchComplaintDto) {
    return this.ops.patchComplaint(id, dto);
  }

  @Get("roles")
  @RequirePermission(StaffPermission.USERS_MANAGE)
  roles() {
    return this.ops.roles();
  }

  @Get("permissions")
  @RequirePermission(StaffPermission.USERS_MANAGE)
  permissions() {
    return this.ops.permissionsCatalog();
  }

  @Patch("roles/:id/permissions")
  @RequirePermission(StaffPermission.USERS_MANAGE)
  patchRolePermissions(@Param("id") id: string, @Body() dto: PatchRolePermissionsDto) {
    return this.ops.patchRolePermissions(id, dto);
  }

  @Get("staff")
  @RequirePermission(StaffPermission.USERS_MANAGE)
  staffUsers() {
    return this.ops.staffUsers();
  }

  @Post("staff")
  @RequirePermission(StaffPermission.USERS_MANAGE)
  createStaff(@Body() dto: CreateStaffDto) {
    return this.ops.createStaff(dto);
  }

  @Patch("staff/:id")
  @RequirePermission(StaffPermission.USERS_MANAGE)
  patchStaff(@Param("id") id: string, @Body() dto: PatchStaffDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchStaff(id, dto, user.sub);
  }

  @Get("legal")
  @RequirePermission(StaffPermission.LEGAL_MANAGE)
  legalPages() {
    return this.ops.legalPages();
  }

  @Patch("legal/:id")
  @RequirePermission(StaffPermission.LEGAL_MANAGE)
  patchLegal(@Param("id") id: string, @Body() dto: PatchLegalDto) {
    return this.ops.patchLegal(id, dto);
  }

  @Get("catalog")
  @RequirePermission(StaffPermission.CATALOG_MANAGE)
  catalog() {
    return this.ops.catalog();
  }

  @Post("catalog")
  @RequirePermission(StaffPermission.CATALOG_MANAGE)
  createService(@Body() dto: UpsertServiceDto) {
    return this.ops.createService(dto);
  }

  @Patch("catalog/:id")
  @RequirePermission(StaffPermission.CATALOG_MANAGE)
  patchService(@Param("id") id: string, @Body() dto: PatchServiceDto) {
    return this.ops.patchService(id, dto);
  }

  @Post("catalog/:id/sub-services")
  @RequirePermission(StaffPermission.CATALOG_MANAGE)
  createSubService(@Param("id") id: string, @Body() dto: UpsertSubServiceDto) {
    return this.ops.createSubService(id, dto);
  }

  @Patch("sub-services/:id")
  @RequirePermission(StaffPermission.CATALOG_MANAGE)
  patchSubService(@Param("id") id: string, @Body() dto: PatchSubServiceDto) {
    return this.ops.patchSubService(id, dto);
  }

  @Get("tickets")
  @RequirePermission(StaffPermission.TICKETS_MANAGE)
  tickets(@Query("status") status?: string) {
    return this.ops.tickets(status);
  }

  @Patch("tickets/:id")
  @RequirePermission(StaffPermission.TICKETS_MANAGE)
  patchTicket(@Param("id") id: string, @Body() dto: PatchTicketDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchTicket(id, dto, user.sub);
  }

  @Post("tickets/:id/comments")
  @RequirePermission(StaffPermission.TICKETS_MANAGE)
  commentTicket(
    @Param("id") id: string,
    @Body() dto: CreateTicketCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.commentTicket(id, dto, user.sub);
  }

  @Get("bank-accounts")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE, StaffPermission.PAYMENTS_REVIEW)
  bankAccounts() {
    return this.ops.bankAccounts();
  }

  @Post("bank-accounts")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE)
  createBank(@Body() dto: UpsertBankDto) {
    return this.ops.createBank(dto);
  }

  @Patch("bank-accounts/:id")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE)
  patchBank(@Param("id") id: string, @Body() dto: PatchBankDto) {
    return this.ops.patchBank(id, dto);
  }

  @Get("banned-phones")
  @RequirePermission(StaffPermission.USERS_MANAGE)
  bannedPhones() {
    return this.ops.bannedPhones();
  }

  @Post("banned-phones")
  @RequirePermission(StaffPermission.USERS_MANAGE)
  banPhone(@Body() dto: CreateBannedPhoneDto, @CurrentUser() user: AuthUser) {
    return this.ops.banPhone(dto, user.sub);
  }

  @Post("banned-phones/:mobile/lift")
  @RequirePermission(StaffPermission.USERS_MANAGE)
  unbanPhone(@Param("mobile") mobile: string) {
    return this.ops.unbanPhone(mobile);
  }

  @Post("coverage")
  @RequirePermission(StaffPermission.GEO_MANAGE)
  createCoverage(@Body() dto: UpsertCoverageDto) {
    return this.ops.createCoverage(dto);
  }

  @Patch("coverage/:id")
  @RequirePermission(StaffPermission.GEO_MANAGE)
  patchCoverage(@Param("id") id: string, @Body() dto: PatchCoverageDto) {
    return this.ops.patchCoverage(id, dto);
  }

  @Get("accounts")
  @RequirePermission(StaffPermission.CUSTOMERS_REVIEW, StaffPermission.PROVIDERS_APPROVE)
  accounts(
    @Query("q") q?: string,
    @Query("accountType") accountType?: string,
    @Query("status") status?: string,
  ) {
    return this.ops.accounts({ q, accountType, status });
  }

  @Patch("accounts/:id")
  @RequirePermission(StaffPermission.CUSTOMERS_REVIEW, StaffPermission.PROVIDERS_APPROVE)
  patchAccount(@Param("id") id: string, @Body() dto: PatchAccountDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchAccount(id, dto, user.sub);
  }

  @Post("broadcast")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE)
  broadcast(@Body() dto: BroadcastDto) {
    return this.ops.broadcast(dto);
  }

  @Get("regions")
  @RequirePermission(StaffPermission.GEO_MANAGE)
  regions() {
    return this.ops.regions();
  }

  @Post("regions")
  @RequirePermission(StaffPermission.GEO_MANAGE)
  createRegion(@Body() dto: UpsertRegionDto) {
    return this.ops.createRegion(dto);
  }

  @Patch("regions/:id")
  @RequirePermission(StaffPermission.GEO_MANAGE)
  patchRegion(@Param("id") id: string, @Body() dto: PatchRegionDto) {
    return this.ops.patchRegion(id, dto);
  }

  @Get("cities")
  @RequirePermission(StaffPermission.GEO_MANAGE)
  cities() {
    return this.ops.cities();
  }

  @Post("cities")
  @RequirePermission(StaffPermission.GEO_MANAGE)
  createCity(@Body() dto: CreateCityDto) {
    return this.ops.createCity(dto);
  }

  @Patch("cities/:id")
  @RequirePermission(StaffPermission.GEO_MANAGE)
  patchCity(@Param("id") id: string, @Body() dto: PatchCityDto) {
    return this.ops.patchCity(id, dto);
  }
}
