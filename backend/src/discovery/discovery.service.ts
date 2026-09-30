import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AccountStatus, AccountType, Visibility } from "../common/enums";
import { publicUploadUrl } from "../common/upload-url";
import { PrismaService } from "../prisma/prisma.service";
import { SearchProvidersDto } from "./dto/search-providers.dto";
import {
  canContactProvider,
  providerSearchWhere,
  refreshExpiredProviders,
} from "../common/account-rules";
import { notifyContact, notifyProfileView } from "../common/notify";

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchProvidersDto, userId?: string) {
    if (dto.q && /^05[0-9]{8}$/.test(dto.q.trim())) {
      throw new BadRequestException("البحث برقم الجوال غير مسموح");
    }

    await refreshExpiredProviders(this.prisma);

    const where: Prisma.UserWhereInput = {
      ...providerSearchWhere(),
      providerProfile: {
        cityId: dto.cityId,
        city: { isVisible: true },
        ...(dto.serviceId || dto.subServiceId
          ? {
              services: {
                some: {
                  isActive: true,
                  ...(dto.serviceId ? { serviceId: dto.serviceId } : {}),
                  ...(dto.subServiceId ? { subServiceId: dto.subServiceId } : {}),
                },
              },
            }
          : {}),
      },
      ...(dto.q
        ? { displayName: { contains: dto.q.trim() } }
        : {}),
    };

    const providers = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        status: true,
        displayName: true,
        lastActiveAt: true,
        providerProfile: {
          select: {
            badge: true,
            lastAppearedAt: true,
            visibility: true,
            city: { select: { id: true, nameAr: true, nameEn: true } },
            services: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              select: {
                isPrimary: true,
                priceFrom: true,
                priceTo: true,
                service: { select: { id: true, nameAr: true, nameEn: true, code: true } },
                subService: { select: { nameAr: true, nameEn: true } },
              },
            },
          },
        },
        subscriptions: {
          where: { status: "ACTIVE", endAt: { gte: new Date() } },
          select: {
            package: {
              select: {
                code: true,
                nameAr: true,
                nameEn: true,
                rank: true,
                hasBadge: true,
                allowWhatsApp: true,
              },
            },
          },
          orderBy: { endAt: "desc" },
          take: 1,
        },
      },
    });

    const ratingStats = providers.length
      ? await this.prisma.rating.groupBy({
          by: ["providerUserId"],
          where: {
            status: "APPROVED",
            providerUserId: { in: providers.map((provider) => provider.id) },
          },
          _avg: { stars: true },
          _count: { _all: true },
        })
      : [];
    const ratingByProvider = new Map(
      ratingStats.map((row) => [
        row.providerUserId,
        {
          ratingAvg: row._avg.stars == null ? null : Number(row._avg.stars.toFixed(1)),
          ratingCount: row._count._all,
        },
      ]),
    );

    const mapped = providers
      .map((provider) => {
        const stats = ratingByProvider.get(provider.id);
        return this.toCard(provider, stats?.ratingAvg ?? null, stats?.ratingCount ?? 0);
      })
      .filter((item) =>
        dto.minRating ? (item.ratingAvg ?? 0) >= dto.minRating : true,
      )
      .sort((a, b) => {
        if (a.appearanceTier !== b.appearanceTier) {
          return a.appearanceTier - b.appearanceTier;
        }
        if (a.packageRank !== b.packageRank) {
          return a.packageRank - b.packageRank;
        }
        const activity = (b.lastAppearedAt ?? b.lastActiveAt ?? "").localeCompare(
          a.lastAppearedAt ?? a.lastActiveAt ?? "",
        );
        if (activity !== 0) {
          return activity;
        }
        if ((b.ratingAvg ?? 0) !== (a.ratingAvg ?? 0)) {
          return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
        }
        return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
      });

    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const items = mapped.slice(start, start + pageSize);

    void this.prisma.searchLog
      .create({
        data: {
          userId,
          query: dto.q,
          cityId: dto.cityId,
          serviceId: dto.serviceId,
          resultCount: mapped.length,
        },
      })
      .catch(() => undefined);

    return { items, total: mapped.length, page, pageSize };
  }

  async getProfile(providerId: string, customerUserId?: string) {
    await refreshExpiredProviders(this.prisma);
    const provider = await this.prisma.user.findFirst({
      where: {
        id: providerId,
        accountType: AccountType.PROVIDER,
        status: { in: [AccountStatus.ACTIVE, AccountStatus.RESTRICTED] },
        providerProfile: { visibility: { in: [Visibility.PUBLIC, Visibility.LIMITED] } },
      },
      include: {
        providerProfile: {
          include: {
            city: true,
            services: {
              where: { isActive: true },
              include: { service: true, subService: true },
              orderBy: { sortOrder: "asc" },
            },
            coverage: { include: { coverageArea: true } },
            portfolio: {
              where: {
                approvalStatus: "APPROVED",
                OR: [{ albumId: null }, { album: { isActive: true } }],
              },
              include: { file: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        subscriptions: {
          where: { status: "ACTIVE", endAt: { gte: new Date() } },
          include: { package: true },
          orderBy: { endAt: "desc" },
          take: 1,
        },
        ratingsReceived: {
          where: { status: "APPROVED" },
          select: { stars: true, note: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!provider?.providerProfile) {
      throw new NotFoundException("الملف غير ظاهر");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingView = await this.prisma.profileViewDaily.findFirst({
      where: {
        providerUserId: provider.id,
        serviceId: null,
        cityId: provider.providerProfile.cityId,
        viewDate: today,
      },
    });
    if (existingView) {
      await this.prisma.profileViewDaily.update({
        where: { id: existingView.id },
        data: { viewCount: { increment: 1 } },
      });
    } else {
      await this.prisma.profileViewDaily.create({
        data: {
          providerUserId: provider.id,
          cityId: provider.providerProfile.cityId,
          viewDate: today,
          viewCount: 1,
        },
      });
    }

    const ratings = provider.ratingsReceived;
    const ratingAvg =
      ratings.length === 0
        ? null
        : Number((ratings.reduce((sum, item) => sum + item.stars, 0) / ratings.length).toFixed(1));
    const card = this.toCard(provider, ratingAvg, ratings.length);
    const pkg = provider.subscriptions[0]?.package;
    if (customerUserId) {
      await this.prisma.recentView.upsert({
        where: {
          UQ_RecentView: { customerUserId, providerUserId: provider.id },
        },
        update: { viewedAt: new Date() },
        create: { customerUserId, providerUserId: provider.id },
      });
      const viewer = await this.prisma.user.findUnique({
        where: { id: customerUserId },
        select: { displayName: true },
      });
      await notifyProfileView(this.prisma, provider.id, customerUserId, viewer?.displayName);
    }
    return {
      ...card,
      bio: provider.providerProfile.bio,
      ratings: provider.ratingsReceived,
      coverage: provider.providerProfile.coverage.map((row) => row.coverageArea),
      services: provider.providerProfile.services.map((row) => ({
        nameAr: row.subService?.nameAr ?? row.service.nameAr,
        nameEn: row.subService?.nameEn ?? row.service.nameEn,
        serviceCode: row.service.code,
        isPrimary: row.isPrimary,
        priceFrom: row.priceFrom == null ? null : Number(row.priceFrom),
        priceTo: row.priceTo == null ? null : Number(row.priceTo),
      })),
      portfolio: provider.providerProfile.portfolio.map((item) => ({
        id: item.id,
        storageKey: item.file.storageKey,
        kind: item.file.kind,
        url: publicUploadUrl(item.file.storageKey),
      })),
      canContact: canContactProvider({
        status: provider.status,
        visibility: provider.providerProfile.visibility,
        allowWhatsApp: pkg?.allowWhatsApp,
        hasLiveSubscription: Boolean(pkg),
      }),
    };
  }

  async openWhatsApp(providerId: string, customerUserId?: string) {
    const provider = await this.prisma.user.findFirst({
      where: {
        id: providerId,
        accountType: AccountType.PROVIDER,
        status: AccountStatus.ACTIVE,
        providerProfile: { visibility: Visibility.PUBLIC },
      },
      include: {
        providerProfile: true,
        subscriptions: {
          where: { status: "ACTIVE", endAt: { gte: new Date() } },
          include: { package: true },
          orderBy: { endAt: "desc" },
          take: 1,
        },
      },
    });

    const contact = provider?.mobile || provider?.providerProfile?.whatsapp;
    if (!contact) {
      throw new NotFoundException("رقم التواصل غير متاح");
    }

    const pkg = provider.subscriptions[0]?.package;
    if (
      !canContactProvider({
        status: provider.status,
        visibility: provider.providerProfile?.visibility,
        allowWhatsApp: pkg?.allowWhatsApp,
        hasLiveSubscription: Boolean(pkg),
      })
    ) {
      throw new ForbiddenException("التواصل غير متاح لهذا الحساب");
    }

    await this.prisma.whatsAppClick.create({
      data: {
        providerUserId: provider.id,
        customerUserId,
      },
    });
    if (customerUserId) {
      const viewer = await this.prisma.user.findUnique({
        where: { id: customerUserId },
        select: { displayName: true },
      });
      await notifyContact(this.prisma, provider.id, customerUserId, viewer?.displayName);
    } else {
      await notifyContact(this.prisma, provider.id);
    }

    const [disclaimerAr, disclaimerEn] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: "whatsapp_disclaimer" } }),
      this.prisma.setting.findUnique({ where: { key: "whatsapp_disclaimer_en" } }),
    ]);
    const phone = this.toWaPhone(contact);

    return {
      phone,
      url: `https://wa.me/${phone}`,
      disclaimerAr: disclaimerAr?.value ?? "الموعد والسعر والدفع خارج المنصة",
      disclaimerEn:
        disclaimerEn?.value ?? "Appointment, price, and payment are outside the platform",
    };
  }

  async rate(providerId: string, customerUserId: string, stars: number, note?: string) {
    const customer = await this.prisma.user.findUnique({ where: { id: customerUserId } });
    if (!customer || customer.accountType !== AccountType.CUSTOMER) {
      throw new ForbiddenException("التقييم متاح للباحثة عن الأنوثة فقط");
    }

    const provider = await this.prisma.user.findFirst({
      where: {
        id: providerId,
        accountType: AccountType.PROVIDER,
        status: AccountStatus.ACTIVE,
      },
      include: {
        subscriptions: {
          where: { status: "ACTIVE", endAt: { gte: new Date() } },
          include: { package: true },
          take: 1,
        },
      },
    });
    if (!provider) {
      throw new NotFoundException("صانعة الجمال غير موجودة");
    }
    if (provider.subscriptions[0] && !provider.subscriptions[0].package.allowRating) {
      throw new ForbiddenException("التقييم غير متاح لهذه الباقة");
    }

    if ((note ?? "").length > 100) {
      throw new BadRequestException("ملاحظة التقييم بحد أقصى 100 حرف");
    }
    const viewed = await this.prisma.recentView.findFirst({
      where: { customerUserId, providerUserId: providerId },
    });
    if (!viewed) {
      throw new BadRequestException("قيّمي الصانعة من صفحة الملف بعد فتحه");
    }
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const recentCount = await this.prisma.rating.count({
      where: {
        customerUserId,
        providerUserId: providerId,
        createdAt: { gte: since },
      },
    });
    if (recentCount >= 12) {
      throw new BadRequestException("تجاوزت حد التقييم لهذه الصانعة خلال 30 يوم");
    }

    return this.prisma.rating.create({
      data: {
        customerUserId,
        providerUserId: providerId,
        stars,
        note,
        status: "PENDING",
      },
    });
  }

  private toCard(
    provider: {
      id: string;
      status?: string;
      displayName: string;
      lastActiveAt: Date | null;
      providerProfile: {
        badge: string | null;
        visibility?: string | null;
        lastAppearedAt?: Date | null;
        city: { id: string; nameAr: string; nameEn: string } | null;
        services: {
          isPrimary?: boolean;
          priceFrom?: { toString(): string } | number | null;
          priceTo?: { toString(): string } | number | null;
          service: { id: string; nameAr: string; nameEn: string; code: string };
          subService: { nameAr: string; nameEn: string } | null;
        }[];
      } | null;
      subscriptions: {
        package: {
          code: string;
          nameAr: string;
          nameEn: string;
          rank: number;
          hasBadge: boolean;
          allowWhatsApp: boolean;
        };
      }[];
    },
    ratingAvg: number | null,
    ratingCount: number,
  ) {
    const pkg = provider.subscriptions[0]?.package;
    const visibility = provider.providerProfile?.visibility;
    const status = provider.status ?? AccountStatus.ACTIVE;
    const lastAppearedAt =
      provider.providerProfile?.lastAppearedAt?.toISOString() ??
      provider.lastActiveAt?.toISOString() ??
      null;

    return {
      id: provider.id,
      displayName: provider.displayName,
      city: provider.providerProfile?.city,
      badge: pkg?.hasBadge ? provider.providerProfile?.badge ?? pkg.nameAr : null,
      packageCode: pkg?.code ?? "FREE",
      packageRank: pkg?.rank ?? 99,
      appearanceTier: status === AccountStatus.ACTIVE && visibility === Visibility.PUBLIC ? 0 : 1,
      services: provider.providerProfile?.services.map((row) => ({
        nameAr: row.subService?.nameAr ?? row.service.nameAr,
        nameEn: row.subService?.nameEn ?? row.service.nameEn,
        serviceCode: row.service.code,
        isPrimary: Boolean(row.isPrimary),
        priceFrom: row.priceFrom == null ? null : Number(row.priceFrom),
        priceTo: row.priceTo == null ? null : Number(row.priceTo),
      })),
      ratingAvg,
      ratingCount,
      lastActiveAt: provider.lastActiveAt?.toISOString() ?? null,
      lastAppearedAt,
      canContact: canContactProvider({
        status,
        visibility,
        allowWhatsApp: pkg?.allowWhatsApp,
        hasLiveSubscription: Boolean(pkg),
      }),
    };
  }

  private toWaPhone(mobile: string) {
    if (mobile.startsWith("05") && mobile.length === 10) {
      return `966${mobile.slice(1)}`;
    }
    return mobile.replace(/^\+/, "");
  }
}
