import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AccountType } from "../common/enums";
import { PrismaService } from "../prisma/prisma.service";
import { FavoriteDto, UpdateCustomerProfileDto } from "./dto/customer.dto";

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.requireCustomer(userId);
    return {
      id: user.id,
      displayName: user.displayName,
      mobile: user.mobile,
      email: user.email,
      accountCode: user.accountCode,
      status: user.status,
      city: user.customerProfile?.city ?? null,
    };
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    await this.requireCustomer(userId);
    if (dto.cityId) {
      const city = await this.prisma.city.findFirst({
        where: { id: dto.cityId, isVisible: true },
      });
      if (!city) {
        throw new BadRequestException("المدينة غير متاحة");
      }
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName ? { displayName: dto.displayName } : {}),
        customerProfile: dto.cityId
          ? { upsert: { create: { cityId: dto.cityId }, update: { cityId: dto.cityId } } }
          : undefined,
      },
    });
    return this.getProfile(userId);
  }

  async listFavorites(userId: string) {
    await this.requireCustomer(userId);
    const rows = await this.prisma.favorite.findMany({
      where: { customerUserId: userId },
      orderBy: { id: "desc" },
    });
    const providerIds = rows.filter((row) => row.targetType === "PROVIDER").map((row) => row.targetId);
    const serviceIds = rows.filter((row) => row.targetType === "SERVICE").map((row) => row.targetId);
    const [providers, services] = await Promise.all([
      providerIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: providerIds } },
            select: { id: true, displayName: true, status: true },
          })
        : Promise.resolve([]),
      serviceIds.length
        ? this.prisma.service.findMany({
            where: { id: { in: serviceIds } },
            select: { id: true, code: true, nameAr: true, nameEn: true },
          })
        : Promise.resolve([]),
    ]);
    const providerById = Object.fromEntries(providers.map((item) => [item.id, item]));
    const serviceById = Object.fromEntries(services.map((item) => [item.id, item]));
    return rows.map((row) => ({
      ...row,
      item: row.targetType === "PROVIDER" ? providerById[row.targetId] ?? null : serviceById[row.targetId] ?? null,
    }));
  }

  async addFavorite(userId: string, dto: FavoriteDto) {
    await this.requireCustomer(userId);
    return this.prisma.favorite.upsert({
      where: {
        UQ_Favorite: {
          customerUserId: userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
      update: {},
      create: {
        customerUserId: userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });
  }

  async removeFavorite(userId: string, dto: FavoriteDto) {
    await this.requireCustomer(userId);
    await this.prisma.favorite.deleteMany({
      where: {
        customerUserId: userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });
    return { ok: true };
  }

  async recentViews(userId: string) {
    await this.requireCustomer(userId);
    const rows = await this.prisma.recentView.findMany({
      where: { customerUserId: userId },
      orderBy: { viewedAt: "desc" },
      take: 30,
    });
    const providers = await this.prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.providerUserId) } },
      select: { id: true, displayName: true, status: true },
    });
    const byId = Object.fromEntries(providers.map((item) => [item.id, item]));
    return rows.map((row) => ({
      ...row,
      provider: byId[row.providerUserId] ?? null,
    }));
  }

  async rememberView(customerUserId: string, providerUserId: string) {
    await this.prisma.recentView.upsert({
      where: {
        UQ_RecentView: { customerUserId, providerUserId },
      },
      update: { viewedAt: new Date() },
      create: { customerUserId, providerUserId },
    });
  }

  private async requireCustomer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: { include: { city: true } } },
    });
    if (!user || user.accountType !== AccountType.CUSTOMER) {
      throw new ForbiddenException("الحساب ليس حساب باحثة عن الأنوثة");
    }
    if (!user.customerProfile) {
      throw new NotFoundException("الملف غير موجود");
    }
    return user;
  }
}
