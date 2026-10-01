import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/auth-user";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  @Patch(":id/read")
  async read(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.sub },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  @Post("read-all")
  async readAll(@CurrentUser() user: AuthUser) {
    await this.prisma.notification.updateMany({
      where: { userId: user.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
