import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { StaffGuard } from "./ops.guard";
import { OpsService } from "./ops.service";
import {
  CreateCityDto,
  PatchCampaignDto,
  PatchCityDto,
  PatchRegionDto,
  ReviewChangeDto,
  UpdateSettingDto,
  UpsertRegionDto,
  UpsertWelcomeDto,
} from "./dto/ops.dto";

@ApiTags("ops")
@ApiBearerAuth()
@UseGuards(StaffGuard)
@Controller("ops")
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get("settings")
  settings() {
    return this.ops.settings();
  }

  @Patch("settings")
  upsertSetting(@Body() dto: UpdateSettingDto) {
    return this.ops.upsertSetting(dto);
  }

  @Get("campaigns")
  campaigns() {
    return this.ops.campaigns();
  }

  @Patch("campaigns/:id")
  patchCampaign(@Param("id") id: string, @Body() dto: PatchCampaignDto) {
    return this.ops.patchCampaign(id, dto);
  }

  @Get("welcome-messages")
  welcomeMessages() {
    return this.ops.welcomeMessages();
  }

  @Post("welcome-messages")
  createWelcome(@Body() dto: UpsertWelcomeDto) {
    return this.ops.createWelcome(dto);
  }

  @Patch("welcome-messages/:id")
  patchWelcome(@Param("id") id: string, @Body() dto: UpsertWelcomeDto) {
    return this.ops.patchWelcome(id, dto);
  }

  @Get("profile-changes")
  profileChanges(@Query("status") status?: string) {
    return this.ops.profileChanges(status);
  }

  @Post("profile-changes/:id/review")
  reviewChange(@Param("id") id: string, @Body() dto: ReviewChangeDto) {
    return this.ops.reviewChange(id, dto.approve !== false);
  }

  @Get("complaints")
  complaints() {
    return this.ops.complaints();
  }

  @Get("regions")
  regions() {
    return this.ops.regions();
  }

  @Post("regions")
  createRegion(@Body() dto: UpsertRegionDto) {
    return this.ops.createRegion(dto);
  }

  @Patch("regions/:id")
  patchRegion(@Param("id") id: string, @Body() dto: PatchRegionDto) {
    return this.ops.patchRegion(id, dto);
  }

  @Get("cities")
  cities() {
    return this.ops.cities();
  }

  @Post("cities")
  createCity(@Body() dto: CreateCityDto) {
    return this.ops.createCity(dto);
  }

  @Patch("cities/:id")
  patchCity(@Param("id") id: string, @Body() dto: PatchCityDto) {
    return this.ops.patchCity(id, dto);
  }
}
