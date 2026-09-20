import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard, OptionalJwtGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/auth-user";
import { DiscoveryService } from "./discovery.service";
import { CreateRatingDto } from "./dto/create-rating.dto";
import { SearchProvidersDto } from "./dto/search-providers.dto";

@ApiTags("discovery")
@Controller()
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get("search")
  @UseGuards(OptionalJwtGuard)
  search(@Query() dto: SearchProvidersDto, @CurrentUser() user?: AuthUser) {
    return this.discovery.search(dto, user?.sub);
  }

  @Get("providers/:id")
  @UseGuards(OptionalJwtGuard)
  profile(@Param("id") id: string, @CurrentUser() user?: AuthUser) {
    return this.discovery.getProfile(id, user?.sub);
  }

  @Post("providers/:id/whatsapp")
  @UseGuards(OptionalJwtGuard)
  whatsapp(@Param("id") id: string, @CurrentUser() user?: AuthUser) {
    return this.discovery.openWhatsApp(id, user?.sub);
  }

  @Post("providers/:id/ratings")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  rate(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRatingDto,
  ) {
    return this.discovery.rate(id, user.sub, dto.stars, dto.note);
  }
}
