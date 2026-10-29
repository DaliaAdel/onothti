import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth-user";
import { StaffGuard, PermissionGuard, RequirePermission } from "./ops.guard";
import { OpsService } from "./ops.service";
import {
  CreateCampaignDto,
  CreateCityDto,
  CreateStaffDto,
  UpsertStaffDepartmentDto,
  PatchStaffDepartmentDto,
  UpsertStaffTeamDto,
  PatchStaffTeamDto,
  PatchCampaignDto,
  PatchCityDto,
  PatchPackageDto,
  PatchRegionDto,
  PatchStaffDto,
  PatchMeDto,
  ReviewChangeDto,
  ReviewMediaDto,
  ReviewProviderDto,
  UpdateSettingDto,
  UpsertPackageDto,
  UpsertRegionDto,
  UpsertWelcomeDto,
  PatchWelcomeDto,
  ReviewRatingDto,
  PatchComplaintDto,
  PatchRolePermissionsDto,
  PatchLegalDto,
  CreateLegalDto,
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
  PatchStaffPermissionsDto,
  CreateOpsTicketDto,
  CreateTicketCommentDto,
  PatchAccountDto,
  NotifyAccountDto,
  BroadcastDto,
} from "./dto/ops.dto";
import { StaffPermission } from "../common/enums";
import { ACC_ORG, ACC_PERMS, ACC_STAFF, FIN_CODES, PRO_CONTENT, TKT_CODES } from "../common/staff-permissions";
import { catalogUpload } from "./catalog-upload";

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

  @Patch("me")
  patchMe(@CurrentUser() user: AuthUser, @Body() dto: PatchMeDto) {
    return this.ops.patchMe(user.sub, dto);
  }

  @Get("events")
  @RequirePermission(StaffPermission.REP_01)
  events(
    @Query("q") q?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("actorId") actorId?: string,
  ) {
    return this.ops.events({ q, action, from, to, actorId });
  }

  @Get("team-activity")
  @RequirePermission(StaffPermission.REP_06)
  teamActivity(@CurrentUser() user: AuthUser) {
    return this.ops.teamActivity(user.sub, user.permissions ?? []);
  }

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthUser) {
    return this.ops.dashboard(user.permissions ?? []);
  }

  @Get("media")
  @RequirePermission(...PRO_CONTENT, ...FIN_CODES, StaffPermission.RAT_01)
  media(
    @Query("status") status?: string,
    @Query("kind") kind?: string,
    @Query("purpose") purpose?: string,
    @Query("accountType") accountType?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.ops.media({ status, kind, purpose, accountType }, user?.permissions ?? []);
  }

  @Post("media/:id/review")
  @RequirePermission(...PRO_CONTENT, ...FIN_CODES)
  reviewMedia(
    @Param("id") id: string,
    @Body() dto: ReviewMediaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.reviewMedia(id, dto, user.sub, user.permissions ?? []);
  }

  @Post("media/:id/escalate-finance")
  @RequirePermission(StaffPermission.PKG_02)
  escalateReceipt(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ops.escalateReceipt(id, user.sub);
  }

  @Get("providers/pending")
  @RequirePermission(StaffPermission.PROVIDERS_APPROVE, StaffPermission.PRO_05, StaffPermission.PRO_06, StaffPermission.PRO_07)
  pendingProviders() {
    return this.ops.pendingProviders();
  }

  @Post("providers/:id/review")
  @RequirePermission(StaffPermission.PROVIDERS_APPROVE, StaffPermission.PRO_05, StaffPermission.PRO_06, StaffPermission.PRO_07)
  reviewProvider(
    @Param("id") id: string,
    @Body() dto: ReviewProviderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.reviewProvider(id, dto, user.sub);
  }

  @Get("packages")
  @RequirePermission(StaffPermission.PKG_01)
  packages() {
    return this.ops.packages();
  }

  @Post("packages")
  @RequirePermission(StaffPermission.PKG_04)
  createPackage(@Body() dto: UpsertPackageDto, @CurrentUser() user: AuthUser) {
    return this.ops.createPackage(dto, user.permissions ?? []);
  }

  @Patch("packages/:id")
  @RequirePermission(StaffPermission.PKG_04, StaffPermission.PKG_05)
  patchPackage(@Param("id") id: string, @Body() dto: PatchPackageDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchPackage(id, dto, user.permissions ?? []);
  }

  @Get("settings")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE, StaffPermission.RAT_05)
  settings() {
    return this.ops.settings();
  }

  @Patch("settings")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE, StaffPermission.RAT_05)
  upsertSetting(@Body() dto: UpdateSettingDto) {
    return this.ops.upsertSetting(dto);
  }

  @Get("campaigns")
  @RequirePermission(StaffPermission.PKG_01)
  campaigns() {
    return this.ops.campaigns();
  }

  @Post("campaigns")
  @RequirePermission(StaffPermission.PKG_03)
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.ops.createCampaign(dto);
  }

  @Patch("campaigns/:id")
  @RequirePermission(StaffPermission.PKG_03)
  patchCampaign(@Param("id") id: string, @Body() dto: PatchCampaignDto) {
    return this.ops.patchCampaign(id, dto);
  }

  @Get("welcome-messages")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE, StaffPermission.RAT_05)
  welcomeMessages() {
    return this.ops.welcomeMessages();
  }

  @Post("welcome-messages")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE, StaffPermission.RAT_05)
  createWelcome(@Body() dto: UpsertWelcomeDto) {
    return this.ops.createWelcome(dto);
  }

  @Patch("welcome-messages/:id")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE, StaffPermission.RAT_05)
  patchWelcome(@Param("id") id: string, @Body() dto: PatchWelcomeDto) {
    return this.ops.patchWelcome(id, dto);
  }

  @Get("profile-changes")
  @RequirePermission(...PRO_CONTENT)
  profileChanges(@Query("status") status?: string) {
    return this.ops.profileChanges(status);
  }

  @Post("profile-changes/:id/review")
  @RequirePermission(...PRO_CONTENT)
  reviewChange(@Param("id") id: string, @Body() dto: ReviewChangeDto, @CurrentUser() user: AuthUser) {
    return this.ops.reviewChange(id, dto.approve !== false, dto.reopen === true, user.permissions ?? []);
  }

  @Get("ratings")
  @RequirePermission(StaffPermission.RAT_01)
  ratings(@Query("status") status?: string) {
    return this.ops.ratings(status);
  }

  @Post("ratings/:id/review")
  @RequirePermission(StaffPermission.RAT_02, StaffPermission.RAT_03)
  reviewRating(@Param("id") id: string, @Body() dto: ReviewRatingDto) {
    return this.ops.reviewRating(id, dto);
  }

  @Get("complaints")
  @RequirePermission(StaffPermission.RAT_01, ...TKT_CODES)
  complaints(@Query("status") status?: string) {
    return this.ops.complaints(status);
  }

  @Patch("complaints/:id")
  @RequirePermission(StaffPermission.RAT_01, ...TKT_CODES)
  patchComplaint(@Param("id") id: string, @Body() dto: PatchComplaintDto) {
    return this.ops.patchComplaint(id, dto);
  }

  @Get("roles")
  @RequirePermission(...ACC_STAFF)
  roles() {
    return this.ops.roles();
  }

  @Get("permissions")
  @RequirePermission(...ACC_PERMS, ...ACC_STAFF)
  permissions() {
    return this.ops.permissionsCatalog();
  }

  @Patch("roles/:id/permissions")
  @RequirePermission(...ACC_PERMS)
  patchRolePermissions(@Param("id") id: string, @Body() dto: PatchRolePermissionsDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchRolePermissions(id, dto, user.permissions ?? [], user.roleCode);
  }

  @Get("staff")
  @RequirePermission(...ACC_STAFF)
  staffUsers(@CurrentUser() user: AuthUser) {
    return this.ops.staffUsers(user.sub, user.permissions ?? []);
  }

  @Get("staff/:id")
  @RequirePermission(...ACC_STAFF)
  staffById(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ops.staffByIdScoped(id, user.sub, user.permissions ?? []);
  }

  @Post("staff")
  @RequirePermission(...ACC_STAFF)
  createStaff(@Body() dto: CreateStaffDto, @CurrentUser() user: AuthUser) {
    return this.ops.createStaff(dto, user.sub, user.permissions ?? []);
  }

  @Patch("staff/:id")
  @RequirePermission(...ACC_STAFF)
  patchStaff(@Param("id") id: string, @Body() dto: PatchStaffDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchStaff(id, dto, user.sub, user.permissions ?? []);
  }

  @Patch("staff/:id/permissions")
  @RequirePermission(...ACC_PERMS)
  patchStaffPermissions(
    @Param("id") id: string,
    @Body() dto: PatchStaffPermissionsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.patchStaffPermissions(id, dto, user.sub, user.permissions ?? []);
  }

  @Get("org")
  @RequirePermission(...ACC_ORG, ...ACC_STAFF)
  orgDepartments(@CurrentUser() user: AuthUser) {
    return this.ops.orgDepartments(user.sub, user.permissions ?? []);
  }


  @Post("org/departments")
  @RequirePermission(StaffPermission.ACC_10)
  createDepartment(@Body() dto: UpsertStaffDepartmentDto, @CurrentUser() user: AuthUser) {
    return this.ops.createDepartment(dto, user.sub, user.permissions ?? []);
  }

  @Patch("org/departments/:id")
  @RequirePermission(StaffPermission.ACC_10)
  patchDepartment(@Param("id") id: string, @Body() dto: PatchStaffDepartmentDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchDepartment(id, dto, user.sub, user.permissions ?? []);
  }

  @Post("org/teams")
  @RequirePermission(StaffPermission.ACC_10)
  createTeam(@Body() dto: UpsertStaffTeamDto, @CurrentUser() user: AuthUser) {
    return this.ops.createTeam(dto, user.sub, user.permissions ?? []);
  }

  @Patch("org/teams/:id")
  @RequirePermission(StaffPermission.ACC_10, StaffPermission.ACC_11)
  patchTeam(@Param("id") id: string, @Body() dto: PatchStaffTeamDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchTeam(id, dto, user.sub, user.permissions ?? []);
  }

  @Get("legal")
  @RequirePermission(StaffPermission.LEGAL_MANAGE, StaffPermission.RAT_05)
  legalPages() {
    return this.ops.legalPages();
  }

  @Post("legal")
  @RequirePermission(StaffPermission.LEGAL_MANAGE, StaffPermission.RAT_05)
  createLegal(@Body() dto: CreateLegalDto) {
    return this.ops.createLegal(dto);
  }

  @Patch("legal/:id")
  @RequirePermission(StaffPermission.LEGAL_MANAGE, StaffPermission.RAT_05)
  patchLegal(@Param("id") id: string, @Body() dto: PatchLegalDto) {
    return this.ops.patchLegal(id, dto);
  }

  @Get("catalog")
  @RequirePermission(StaffPermission.CAT_01)
  catalog() {
    return this.ops.catalog();
  }

  @Post("catalog")
  @RequirePermission(StaffPermission.CAT_01)
  createService(@Body() dto: UpsertServiceDto) {
    return this.ops.createService(dto);
  }

  @Patch("catalog/:id")
  @RequirePermission(StaffPermission.CAT_01)
  patchService(@Param("id") id: string, @Body() dto: PatchServiceDto) {
    return this.ops.patchService(id, dto);
  }

  @Post("catalog/:id/image")
  @RequirePermission(StaffPermission.CAT_01)
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
      required: ["file"],
    },
  })
  @UseInterceptors(FileInterceptor("file", catalogUpload))
  uploadServiceImage(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: { filename: string; mimetype: string; size: number },
  ) {
    return this.ops.uploadServiceImage(id, file, user.sub);
  }

  @Delete("catalog/:id/image")
  @RequirePermission(StaffPermission.CAT_01)
  clearServiceImage(@Param("id") id: string) {
    return this.ops.clearServiceImage(id);
  }

  @Post("catalog/:id/sub-services")
  @RequirePermission(StaffPermission.CAT_01)
  createSubService(@Param("id") id: string, @Body() dto: UpsertSubServiceDto) {
    return this.ops.createSubService(id, dto);
  }

  @Patch("sub-services/:id")
  @RequirePermission(StaffPermission.CAT_01)
  patchSubService(@Param("id") id: string, @Body() dto: PatchSubServiceDto) {
    return this.ops.patchSubService(id, dto);
  }

  @Get("ticket-types")
  @RequirePermission(...TKT_CODES)
  ticketTypes() {
    return this.ops.ticketTypes();
  }

  @Get("tickets")
  @RequirePermission(...TKT_CODES)
  tickets(
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("queue") queue?: string,
    @Query("mine") mine?: string,
    @Query("accountType") accountType?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.ops.tickets(
      { status, priority, queue, mine, accountType, actorId: user?.sub },
      user?.permissions ?? [],
    );
  }

  @Post("tickets")
  @RequirePermission(StaffPermission.TKT_01)
  createTicket(@Body() dto: CreateOpsTicketDto, @CurrentUser() user: AuthUser) {
    return this.ops.createTicket(user.sub, dto);
  }

  @Patch("tickets/:id")
  @RequirePermission(...TKT_CODES)
  patchTicket(@Param("id") id: string, @Body() dto: PatchTicketDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchTicket(id, dto, user.sub, user.permissions ?? []);
  }

  @Post("tickets/:id/comments")
  @RequirePermission(StaffPermission.TKT_01)
  commentTicket(
    @Param("id") id: string,
    @Body() dto: CreateTicketCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ops.commentTicket(id, dto, user.sub);
  }

  @Get("bank-accounts")
  @RequirePermission(StaffPermission.SETTINGS_MANAGE, StaffPermission.FIN_01)
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
  @RequirePermission(StaffPermission.USR_04)
  bannedPhones() {
    return this.ops.bannedPhones();
  }

  @Post("banned-phones")
  @RequirePermission(StaffPermission.USR_04)
  banPhone(@Body() dto: CreateBannedPhoneDto, @CurrentUser() user: AuthUser) {
    return this.ops.banPhone(dto, user.sub);
  }

  @Post("banned-phones/:mobile/lift")
  @RequirePermission(StaffPermission.USR_04)
  unbanPhone(@Param("mobile") mobile: string) {
    return this.ops.unbanPhone(mobile);
  }

  @Post("coverage")
  @RequirePermission(StaffPermission.CAT_02)
  createCoverage(@Body() dto: UpsertCoverageDto) {
    return this.ops.createCoverage(dto);
  }

  @Patch("coverage/:id")
  @RequirePermission(StaffPermission.CAT_02)
  patchCoverage(@Param("id") id: string, @Body() dto: PatchCoverageDto) {
    return this.ops.patchCoverage(id, dto);
  }

  @Get("accounts")
  @RequirePermission(
    StaffPermission.PRO_01,
    StaffPermission.PROVIDERS_APPROVE,
    StaffPermission.NOT_01,
    StaffPermission.USR_01,
  )
  accounts(
    @Query("q") q?: string,
    @Query("accountType") accountType?: string,
    @Query("status") status?: string,
  ) {
    return this.ops.accounts({ q, accountType, status });
  }

  @Get("accounts/:id")
  @RequirePermission(
    StaffPermission.PRO_01,
    StaffPermission.PROVIDERS_APPROVE,
    StaffPermission.NOT_01,
    StaffPermission.USR_01,
  )
  accountDetail(@Param("id") id: string) {
    return this.ops.accountDetail(id);
  }

  @Patch("accounts/:id")
  @RequirePermission(StaffPermission.USR_01, StaffPermission.USR_05, StaffPermission.USR_06, StaffPermission.PKG_04)
  patchAccount(@Param("id") id: string, @Body() dto: PatchAccountDto, @CurrentUser() user: AuthUser) {
    return this.ops.patchAccount(id, dto, user.sub, user.permissions ?? []);
  }

  @Post("accounts/:id/notify")
  @RequirePermission(StaffPermission.NOT_01)
  notifyAccount(@Param("id") id: string, @Body() dto: NotifyAccountDto, @CurrentUser() user: AuthUser) {
    return this.ops.notifyAccount(id, dto, user.sub, user.permissions ?? []);
  }

  @Post("broadcast")
  @RequirePermission(
    StaffPermission.NOT_02,
    StaffPermission.NOT_03,
    StaffPermission.NOT_04,
  )
  broadcast(@Body() dto: BroadcastDto, @CurrentUser() user: AuthUser) {
    return this.ops.broadcast(dto, user.permissions ?? []);
  }

  @Get("regions")
  @RequirePermission(StaffPermission.CAT_02)
  regions() {
    return this.ops.regions();
  }

  @Post("regions")
  @RequirePermission(StaffPermission.CAT_02)
  createRegion(@Body() dto: UpsertRegionDto) {
    return this.ops.createRegion(dto);
  }

  @Patch("regions/:id")
  @RequirePermission(StaffPermission.CAT_02)
  patchRegion(@Param("id") id: string, @Body() dto: PatchRegionDto) {
    return this.ops.patchRegion(id, dto);
  }

  @Get("cities")
  @RequirePermission(StaffPermission.CAT_02)
  cities() {
    return this.ops.cities();
  }

  @Post("cities")
  @RequirePermission(StaffPermission.CAT_02)
  createCity(@Body() dto: CreateCityDto) {
    return this.ops.createCity(dto);
  }

  @Patch("cities/:id")
  @RequirePermission(StaffPermission.CAT_02)
  patchCity(@Param("id") id: string, @Body() dto: PatchCityDto) {
    return this.ops.patchCity(id, dto);
  }
}
