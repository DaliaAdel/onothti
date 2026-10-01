import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AccountType, ProfileChangeField } from "../common/enums";
import { PrismaService } from "../prisma/prisma.service";
import { CreateComplaintDto, FavoriteDto, UpdateCustomerProfileDto } from "./dto/customer.dto";
import {
  assertUniqueDisplayName,
  assertUniqueEmail,
  pendingChangesFor,
  pendingValue,
  queueProfileChange,
} from "../common/account-rules";

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.requireCustomer(userId);
    const pending = await pendingChangesFor(this.prisma, userId);
    return {
      id: user.id,
      displayName: pendingValue(pending, ProfileChangeField.DISPLAY_NAME) ?? user.displayName,
      mobile: user.mobile,
      email: pendingValue(pending, ProfileChangeField.EMAIL) ?? user.email,
      accountCode: user.accountCode,
      status: user.status,
      city: user.customerProfile?.city ?? null,
      pendingChanges: pending,
    };
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const user = await this.requireCustomer(userId);
    if (dto.cityId) {
      const city = await this.prisma.city.findFirst({
        where: { id: dto.cityId, isVisible: true },
      });
      if (!city) {
        throw new BadRequestException("المدينة غير متاحة");
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          customerProfile: { upsert: { create: { cityId: dto.cityId }, update: { cityId: dto.cityId } } },
        },
      });
    }
    if (dto.displayName) {
      const name = await assertUniqueDisplayName(
        this.prisma,
        AccountType.CUSTOMER,
        dto.displayName,
        userId,
      );
      await queueProfileChange(
        this.prisma,
        userId,
        ProfileChangeField.DISPLAY_NAME,
        user.displayName,
        name,
      );
    }
    if (dto.email !== undefined) {
      const email = await assertUniqueEmail(this.prisma, dto.email, userId);
      await queueProfileChange(
        this.prisma,
        userId,
        ProfileChangeField.EMAIL,
        user.email,
        email ?? "",
      );
    }
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
    const toObject = (row: (typeof rows)[number]) => ({
      ...row,
      item:
        row.targetType === "PROVIDER"
          ? providerById[row.targetId] ?? null
          : serviceById[row.targetId] ?? null,
    });
    return {
      provider: rows.filter((row) => row.targetType === "PROVIDER").map(toObject),
      service: rows.filter((row) => row.targetType === "SERVICE").map(toObject),
    };
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

  async listComplaints(userId: string) {
    await this.requireCustomer(userId);
    return this.prisma.complaint.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createComplaint(userId: string, dto: CreateComplaintDto) {
    await this.requireCustomer(userId);
    const target = await this.prisma.user.findFirst({
      where: { id: dto.targetUserId, accountType: AccountType.PROVIDER },
    });
    if (!target) {
      throw new NotFoundException("صانعة الجمال غير موجودة");
    }
    return this.prisma.complaint.create({
      data: {
        reporterId: userId,
        targetUserId: target.id,
        targetRef: dto.targetRef,
        reason: dto.reason.trim(),
        status: "OPEN",
      },
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
