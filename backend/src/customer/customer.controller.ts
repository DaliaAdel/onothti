import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/auth-user";
import { CustomerService } from "./customer.service";
import { FavoriteDto, UpdateCustomerProfileDto } from "./dto/customer.dto";

@ApiTags("customer")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("customer")
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}

  @Get("profile")
  profile(@CurrentUser() user: AuthUser) {
    return this.customer.getProfile(user.sub);
  }

  @Patch("profile")
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateCustomerProfileDto) {
    return this.customer.updateProfile(user.sub, dto);
  }

  @Get("favorites")
  favorites(@CurrentUser() user: AuthUser) {
    return this.customer.listFavorites(user.sub);
  }

  @Post("favorites")
  addFavorite(@CurrentUser() user: AuthUser, @Body() dto: FavoriteDto) {
    return this.customer.addFavorite(user.sub, dto);
  }

  @Delete("favorites")
  removeFavorite(@CurrentUser() user: AuthUser, @Body() dto: FavoriteDto) {
    return this.customer.removeFavorite(user.sub, dto);
  }

  @Get("recent-views")
  recentViews(@CurrentUser() user: AuthUser) {
    return this.customer.recentViews(user.sub);
  }
}
