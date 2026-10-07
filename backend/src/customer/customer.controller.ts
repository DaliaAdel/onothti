import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/auth-user";
import { CustomerService } from "./customer.service";
import {
  CreateComplaintDto,
  CreateCustomerTicketDto,
  FavoriteDto,
  UpdateCustomerProfileDto,
} from "./dto/customer.dto";

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

  @Get("ticket-types")
  ticketTypes() {
    return this.customer.ticketTypes();
  }

  @Get("tickets")
  tickets(@CurrentUser() user: AuthUser) {
    return this.customer.listTickets(user.sub);
  }

  @Post("tickets")
  createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerTicketDto) {
    return this.customer.createTicket(user.sub, dto);
  }

  @Get("complaints")
  complaints(@CurrentUser() user: AuthUser) {
    return this.customer.listComplaints(user.sub);
  }

  @Post("complaints")
  createComplaint(@CurrentUser() user: AuthUser, @Body() dto: CreateComplaintDto) {
    return this.customer.createComplaint(user.sub, dto);
  }
}
