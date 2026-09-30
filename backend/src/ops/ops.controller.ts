import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { StaffGuard } from "./ops.guard";
import { OpsService } from "./ops.service";
import { PatchCampaignDto, ReviewChangeDto, UpdateSettingDto, UpsertWelcomeDto } from "./dto/ops.dto";

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
}
