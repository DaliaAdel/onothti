import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/auth-user";
import { ProviderService } from "./provider.service";
import { avatarUpload } from "./avatar-upload";
import { portfolioUpload } from "./portfolio-upload";
import {
  AddPortfolioDto,
  AddProviderServiceDto,
  CreatePortfolioAlbumDto,
  CreateProviderTicketDto,
  PatchPortfolioAlbumDto,
  PatchProviderServiceDto,
  ReorderProviderServicesDto,
  SubmitPaymentProofDto,
  UpdateProviderCoverageDto,
  UpdateProviderProfileDto,
} from "./dto/provider.dto";

@ApiTags("provider")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("provider")
export class ProviderController {
  constructor(private readonly provider: ProviderService) {}

  @Get("profile")
  profile(@CurrentUser() user: AuthUser) {
    return this.provider.getProfile(user.sub);
  }

  @Patch("profile")
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProviderProfileDto) {
    return this.provider.updateProfile(user.sub, dto);
  }

  @Post("avatar")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
      required: ["file"],
    },
  })
  @UseInterceptors(FileInterceptor("file", avatarUpload))
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: { filename: string; mimetype: string; size: number },
  ) {
    return this.provider.uploadAvatar(user.sub, file);
  }

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthUser) {
    return this.provider.dashboard(user.sub);
  }

  @Get("services")
  services(@CurrentUser() user: AuthUser) {
    return this.provider.listServices(user.sub);
  }

  @Post("services")
  addService(@CurrentUser() user: AuthUser, @Body() dto: AddProviderServiceDto) {
    return this.provider.addService(user.sub, dto);
  }

  @Put("services/order")
  reorderServices(@CurrentUser() user: AuthUser, @Body() dto: ReorderProviderServicesDto) {
    return this.provider.reorderServices(user.sub, dto.ids);
  }

  @Patch("services/:id")
  patchService(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: PatchProviderServiceDto,
  ) {
    return this.provider.patchService(user.sub, id, dto);
  }

  @Delete("services/:id")
  removeService(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.provider.removeService(user.sub, id);
  }

  @Get("coverage")
  coverage(@CurrentUser() user: AuthUser) {
    return this.provider.listCoverage(user.sub);
  }

  @Put("coverage")
  updateCoverage(@CurrentUser() user: AuthUser, @Body() dto: UpdateProviderCoverageDto) {
    return this.provider.updateCoverage(user.sub, dto);
  }

  @Get("portfolio")
  portfolio(@CurrentUser() user: AuthUser, @Query("albumId") albumId?: string) {
    return this.provider.listPortfolio(user.sub, albumId);
  }

  @Get("albums")
  albums(@CurrentUser() user: AuthUser) {
    return this.provider.listAlbums(user.sub);
  }

  @Post("albums")
  createAlbum(@CurrentUser() user: AuthUser, @Body() dto: CreatePortfolioAlbumDto) {
    return this.provider.createAlbum(user.sub, dto);
  }

  @Get("albums/:id")
  album(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.provider.getAlbum(user.sub, id);
  }

  @Patch("albums/:id")
  patchAlbum(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: PatchPortfolioAlbumDto,
  ) {
    return this.provider.patchAlbum(user.sub, id, dto);
  }

  @Delete("albums/:id")
  removeAlbum(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.provider.removeAlbum(user.sub, id);
  }

  @Post("portfolio")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        kind: { type: "string", enum: ["IMAGE", "VIDEO"] },
      },
      required: ["file"],
    },
  })
  @UseInterceptors(FileInterceptor("file", portfolioUpload))
  addPortfolio(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddPortfolioDto,
    @UploadedFile() file?: { filename: string; mimetype: string; size: number },
  ) {
    return this.provider.addPortfolio(user.sub, dto, file);
  }

  @Delete("portfolio/:id")
  removePortfolio(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.provider.removePortfolio(user.sub, id);
  }

  @Get("reviews")
  reviews(@CurrentUser() user: AuthUser) {
    return this.provider.listReviews(user.sub);
  }

  @Get("views")
  views(@CurrentUser() user: AuthUser) {
    return this.provider.listViews(user.sub);
  }

  @Get("subscription")
  subscription(@CurrentUser() user: AuthUser) {
    return this.provider.subscription(user.sub);
  }

  @Post("subscription/campaign")
  joinCampaign(@CurrentUser() user: AuthUser) {
    return this.provider.joinCampaign(user.sub);
  }

  @Get("payment-proofs")
  proofs(@CurrentUser() user: AuthUser) {
    return this.provider.listProofs(user.sub);
  }

  @Post("payment-proofs")
  submitProof(@CurrentUser() user: AuthUser, @Body() dto: SubmitPaymentProofDto) {
    return this.provider.submitProof(user.sub, dto);
  }

  @Get("ticket-types")
  ticketTypes() {
    return this.provider.ticketTypes();
  }

  @Get("tickets")
  tickets(@CurrentUser() user: AuthUser) {
    return this.provider.listTickets(user.sub);
  }

  @Post("tickets")
  createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateProviderTicketDto) {
    return this.provider.createTicket(user.sub, dto);
  }
}
