import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AccountType, ProfileChangeField } from "../common/enums";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateComplaintDto,
  CreateCustomerTicketDto,
  FavoriteDto,
  UpdateCustomerProfileDto,
} from "./dto/customer.dto";
import {
  assertUniqueDisplayName,
  assertUniqueEmail,
  pendingChangesFor,
  pendingValue,
  queueProfileChange,
} from "../common/account-rules";
import { orderedCitiesFromRows, replaceCustomerCities, resolveCityIds } from "../common/geo";

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.requireCustomer(userId);
    const pending = await pendingChangesFor(this.prisma, userId);
    const geo = orderedCitiesFromRows(
      user.customerProfile?.cities ?? [],
      user.customerProfile?.city ?? null,
    );
    return {
      id: user.id,
      displayName: pendingValue(pending, ProfileChangeField.DISPLAY_NAME) ?? user.displayName,
      mobile: user.mobile,
      email: pendingValue(pending, ProfileChangeField.EMAIL) ?? user.email,
      accountCode: user.accountCode,
      status: user.status,
      city: geo.city,
      cities: geo.cities,
      region: geo.region,
      pendingChanges: pending,
    };
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const user = await this.requireCustomer(userId);
    const cityIds = resolveCityIds(dto.cityId, dto.cityIds);
    if (cityIds.length) {
      await replaceCustomerCities(this.prisma, userId, cityIds);
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

  async ticketTypes() {
    return this.prisma.ticketType.findMany({
      where: { audience: AccountType.CUSTOMER },
      orderBy: { code: "asc" },
    });
  }

  async listTickets(userId: string) {
    await this.requireCustomer(userId);
    return this.prisma.ticket.findMany({
      where: { ownerId: userId },
      include: {
        type: true,
        comments: {
          include: { author: { select: { displayName: true, accountType: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTicket(userId: string, dto: CreateCustomerTicketDto) {
    await this.requireCustomer(userId);
    const type = await this.prisma.ticketType.findFirst({
      where: { code: dto.typeCode, audience: AccountType.CUSTOMER },
    });
    if (!type) {
      throw new BadRequestException("نوع التذكرة غير متاح");
    }
    const count = await this.prisma.ticket.count();
    return this.prisma.ticket.create({
      data: {
        refNo: `CU-${String(count + 1).padStart(6, "0")}-${userId.slice(0, 4)}`,
        typeId: type.id,
        ownerId: userId,
        body: dto.body.trim(),
      },
      include: { type: true },
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
      include: {
        customerProfile: {
          include: {
            city: { include: { region: true } },
            cities: {
              include: { city: { include: { region: true } } },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
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
