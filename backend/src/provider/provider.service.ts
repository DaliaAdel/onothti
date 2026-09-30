import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AccountType, ProfileChangeField, Visibility } from "../common/enums";
import { PrismaService } from "../prisma/prisma.service";
import {
  AddPortfolioDto,
  AddProviderServiceDto,
  CreateProviderTicketDto,
  PatchProviderServiceDto,
  SubmitPaymentProofDto,
  UpdateProviderCoverageDto,
  UpdateProviderProfileDto,
} from "./dto/provider.dto";
import {
  assertUniqueDisplayName,
  assertUniqueEmail,
  liveCampaign,
  pendingChangesFor,
  pendingValue,
  queueProfileChange,
} from "../common/account-rules";
import { publicUploadUrl } from "../common/upload-url";

@Injectable()
export class ProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.requireProvider(userId);
    return this.toProfile(user);
  }

  async uploadAvatar(userId: string, file?: { filename: string; mimetype: string; size: number }) {
    const user = await this.requireProvider(userId);
    if (!file) {
      throw new BadRequestException("اختاري صورة للحساب");
    }
    const media = await this.prisma.mediaFile.create({
      data: {
        storageKey: `avatars/${file.filename}`,
        mime: file.mimetype,
        sizeBytes: file.size,
        kind: "IMAGE",
        status: "PENDING",
        uploadedById: userId,
      },
    });
    await queueProfileChange(
      this.prisma,
      userId,
      ProfileChangeField.AVATAR,
      user.avatarFileId,
      media.id,
    );
    return this.getProfile(userId);
  }

  async updateProfile(userId: string, dto: UpdateProviderProfileDto) {
    const user = await this.requireProvider(userId);
    if (dto.cityId) {
      const city = await this.prisma.city.findFirst({
        where: { id: dto.cityId, isVisible: true },
      });
      if (!city) {
        throw new BadRequestException("المدينة غير متاحة");
      }
      await queueProfileChange(
        this.prisma,
        userId,
        ProfileChangeField.CITY,
        user.providerProfile.cityId,
        dto.cityId,
      );
    }
    if (dto.displayName) {
      const name = await assertUniqueDisplayName(
        this.prisma,
        AccountType.PROVIDER,
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
    if (dto.bio !== undefined) {
      await queueProfileChange(
        this.prisma,
        userId,
        ProfileChangeField.BIO,
        user.providerProfile.bio,
        dto.bio,
      );
    }
    if (dto.whatsapp !== undefined) {
      const mobile = toSaudiMobile(dto.whatsapp);
      if (!/^05[0-9]{8}$/.test(mobile)) {
        throw new BadRequestException("رقم الجوال لازم يكون سعودي 10 أرقام ويبدأ بـ 05");
      }
      await queueProfileChange(
        this.prisma,
        userId,
        ProfileChangeField.WHATSAPP,
        user.providerProfile.whatsapp,
        mobile,
      );
    }
    return this.getProfile(userId);
  }

  async dashboard(userId: string) {
    const profile = await this.getProfile(userId);
    const since = daysAgo(30);
    const [views, ratingStats, photos, services] = await Promise.all([
      this.prisma.profileViewDaily.aggregate({
        where: { providerUserId: userId, viewDate: { gte: since } },
        _sum: { viewCount: true },
      }),
      this.prisma.rating.aggregate({
        where: { providerUserId: userId, status: "APPROVED" },
        _avg: { stars: true },
        _count: { _all: true },
      }),
      this.prisma.portfolioItem.findMany({
        where: { providerUserId: userId },
        select: { approvalStatus: true },
      }),
      this.prisma.providerService.count({ where: { providerUserId: userId } }),
    ]);
    const photosApproved = photos.filter((item) => item.approvalStatus === "APPROVED").length;
    const photosPending = photos.filter((item) => item.approvalStatus === "PENDING").length;
    const completion = [
      Boolean(profile.displayName),
      Boolean(profile.city),
      Boolean(profile.whatsapp),
      Boolean(profile.bio),
      services > 0,
    ].filter(Boolean).length;
    return {
      profile,
      stats: {
        views30d: views._sum.viewCount ?? 0,
        ratingAvg:
          ratingStats._avg.stars == null ? null : Number(ratingStats._avg.stars.toFixed(1)),
        ratingCount: ratingStats._count._all,
        photosApproved,
        photosPending,
        servicesCount: services,
        completionPercent: completion * 20,
      },
      subscription: await this.currentSubscription(userId),
    };
  }

  async listServices(userId: string) {
    await this.requireProvider(userId);
    return this.prisma.providerService.findMany({
      where: { providerUserId: userId },
      include: { service: true, subService: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async addService(userId: string, dto: AddProviderServiceDto) {
    await this.requireProvider(userId);
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, isVisible: true },
    });
    if (!service) {
      throw new BadRequestException("الخدمة غير متاحة");
    }
    const sub = await this.prisma.subService.findFirst({
      where: { id: dto.subServiceId, serviceId: dto.serviceId, isVisible: true },
    });
    if (!sub) {
      throw new BadRequestException("اختاري خدمة رئيسية وفرعية");
    }
    this.assertPrices(dto.priceFrom, dto.priceTo);
    const limits = await this.packageLimits(userId);
    const count = await this.prisma.providerService.count({ where: { providerUserId: userId } });
    if (limits.maxServices != null && count >= limits.maxServices) {
      throw new ForbiddenException("تجاوزتِ حد الخدمات في باقتك");
    }
    const makePrimary = dto.isPrimary || count === 0;
    if (makePrimary) {
      await this.prisma.providerService.updateMany({
        where: { providerUserId: userId },
        data: { isPrimary: false },
      });
    }
    try {
      return await this.prisma.providerService.create({
        data: {
          providerUserId: userId,
          serviceId: dto.serviceId,
          subServiceId: dto.subServiceId,
          isPrimary: makePrimary,
          priceFrom: dto.priceFrom,
          priceTo: dto.priceTo,
          sortOrder: count,
        },
        include: { service: true, subService: true },
      });
    } catch {
      throw new ConflictException("الخدمة مضافة بالفعل");
    }
  }

  async patchService(userId: string, id: string, dto: PatchProviderServiceDto) {
    await this.requireProvider(userId);
    const row = await this.prisma.providerService.findFirst({
      where: { id, providerUserId: userId },
    });
    if (!row) {
      throw new NotFoundException("الخدمة غير موجودة");
    }
    const priceFrom = dto.priceFrom ?? (row.priceFrom == null ? undefined : Number(row.priceFrom));
    const priceTo = dto.priceTo ?? (row.priceTo == null ? undefined : Number(row.priceTo));
    this.assertPrices(priceFrom, priceTo);
    if (dto.isPrimary) {
      await this.prisma.providerService.updateMany({
        where: { providerUserId: userId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.providerService.update({
      where: { id },
      data: {
        ...(dto.priceFrom !== undefined ? { priceFrom: dto.priceFrom } : {}),
        ...(dto.priceTo !== undefined ? { priceTo: dto.priceTo } : {}),
        ...(dto.isPrimary ? { isPrimary: true } : {}),
      },
      include: { service: true, subService: true },
    });
  }

  async removeService(userId: string, id: string) {
    await this.requireProvider(userId);
    const row = await this.prisma.providerService.findFirst({
      where: { id, providerUserId: userId },
    });
    if (!row) {
      throw new NotFoundException("الخدمة غير موجودة");
    }
    const count = await this.prisma.providerService.count({ where: { providerUserId: userId } });
    if (count <= 1) {
      throw new BadRequestException("لازم تبقى خدمة رئيسية وفرعية واحدة على الأقل");
    }
    await this.prisma.providerService.delete({ where: { id } });
    if (row.isPrimary) {
      const next = await this.prisma.providerService.findFirst({
        where: { providerUserId: userId },
        orderBy: { sortOrder: "asc" },
      });
      if (next) {
        await this.prisma.providerService.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }
    return { ok: true };
  }

  async listCoverage(userId: string) {
    await this.requireProvider(userId);
    return this.prisma.providerCoverage.findMany({
      where: { providerUserId: userId },
      include: { coverageArea: { include: { city: true } } },
    });
  }

  async updateCoverage(userId: string, dto: UpdateProviderCoverageDto) {
    const user = await this.requireProvider(userId);
    const areas = await this.prisma.coverageArea.findMany({
      where: {
        id: { in: dto.areaIds },
        isVisible: true,
        ...(user.providerProfile.cityId ? { cityId: user.providerProfile.cityId } : {}),
      },
    });
    if (areas.length !== dto.areaIds.length) {
      throw new BadRequestException("مناطق التغطية غير متاحة لهذه المدينة");
    }
    await this.prisma.providerCoverage.deleteMany({ where: { providerUserId: userId } });
    await this.prisma.providerCoverage.createMany({
      data: dto.areaIds.map((coverageAreaId) => ({ providerUserId: userId, coverageAreaId })),
    });
    return this.listCoverage(userId);
  }

  async listPortfolio(userId: string) {
    await this.requireProvider(userId);
    const items = await this.prisma.portfolioItem.findMany({
      where: { providerUserId: userId },
      include: { file: true },
      orderBy: { sortOrder: "asc" },
    });
    return items.map((item) => this.toPortfolioItem(item));
  }

  async addPortfolio(
    userId: string,
    dto: AddPortfolioDto,
    uploaded?: { filename: string; mimetype: string; size: number },
  ) {
    await this.requireProvider(userId);
    if (!uploaded) {
      throw new BadRequestException("اختاري صورة أو فيديو للعمل");
    }
    const kind = uploaded.mimetype.startsWith("video/")
      ? "VIDEO"
      : uploaded.mimetype.startsWith("image/")
        ? "IMAGE"
        : (dto.kind ?? "IMAGE");
    const limits = await this.packageLimits(userId);
    const photos = await this.prisma.portfolioItem.count({
      where: { providerUserId: userId, file: { kind: "IMAGE" } },
    });
    const videos = await this.prisma.portfolioItem.count({
      where: { providerUserId: userId, file: { kind: "VIDEO" } },
    });
    if (kind === "IMAGE" && limits.maxPhotos != null && photos >= limits.maxPhotos) {
      throw new ForbiddenException("تجاوزتِ حد الصور في باقتك");
    }
    if (kind === "VIDEO" && limits.maxVideos != null && videos >= limits.maxVideos) {
      throw new ForbiddenException("تجاوزتِ حد الفيديو في باقتك");
    }
    const count = photos + videos;
    const file = await this.prisma.mediaFile.create({
      data: {
        storageKey: `portfolio/${uploaded.filename}`,
        mime: uploaded.mimetype,
        sizeBytes: uploaded.size,
        kind,
        status: "PENDING",
        uploadedById: userId,
      },
    });
    const item = await this.prisma.portfolioItem.create({
      data: {
        providerUserId: userId,
        fileId: file.id,
        sortOrder: count,
        approvalStatus: "PENDING",
      },
      include: { file: true },
    });
    return this.toPortfolioItem(item);
  }

  async removePortfolio(userId: string, id: string) {
    await this.requireProvider(userId);
    const item = await this.prisma.portfolioItem.findFirst({
      where: { id, providerUserId: userId },
    });
    if (!item) {
      throw new NotFoundException("العمل غير موجود");
    }
    await this.prisma.portfolioItem.delete({ where: { id } });
    return { ok: true };
  }

  async listReviews(userId: string) {
    await this.requireProvider(userId);
    const ratings = await this.prisma.rating.findMany({
      where: { providerUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, stars: true, note: true, status: true, createdAt: true },
    });
    const approved = ratings.filter((item) => item.status === "APPROVED");
    const avg =
      approved.length === 0
        ? null
        : Number(
            (approved.reduce((sum, item) => sum + item.stars, 0) / approved.length).toFixed(1),
          );
    return { ratingAvg: avg, ratingCount: approved.length, items: ratings };
  }

  async listViews(userId: string) {
    await this.requireProvider(userId);
    const since = daysAgo(30);
    const rows = await this.prisma.profileViewDaily.findMany({
      where: { providerUserId: userId, viewDate: { gte: since } },
      include: { city: { select: { id: true, nameAr: true, nameEn: true } } },
      orderBy: { viewDate: "desc" },
    });
    return {
      total: rows.reduce((sum, row) => sum + row.viewCount, 0),
      items: rows.map((row) => ({
        date: row.viewDate,
        viewCount: row.viewCount,
        city: row.city,
      })),
    };
  }

  async subscription(userId: string) {
    await this.requireProvider(userId);
    const [current, packages, bankAccounts, proofs] = await Promise.all([
      this.currentSubscription(userId),
      this.prisma.package.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
      this.prisma.bankAccount.findMany({ where: { isActive: true } }),
      this.listProofs(userId),
    ]);
    return {
      current,
      packages: packages.map(toPackage),
      bankAccounts,
      proofs,
      campaign: await liveCampaign(this.prisma),
      extensionMonths: await this.prisma.getSettingInt("package_extension_months", 0),
    };
  }

  async joinCampaign(userId: string) {
    await this.requireProvider(userId);
    const campaign = await liveCampaign(this.prisma);
    if (!campaign) {
      throw new BadRequestException("لا توجد حملة مجانية مفعّلة حالياً");
    }
    const free = await this.prisma.package.findFirst({
      where: { code: "FREE", isActive: true },
    });
    if (!free) {
      throw new BadRequestException("الباقة المجانية غير متاحة");
    }
    const active = await this.prisma.subscription.findFirst({
      where: { providerUserId: userId, status: "ACTIVE", endAt: { gte: new Date() } },
    });
    if (active) {
      throw new BadRequestException("لديكِ اشتراك نشط بالفعل");
    }
    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setDate(endAt.getDate() + campaign.benefitDays);
    const subscription = await this.prisma.subscription.create({
      data: {
        providerUserId: userId,
        packageId: free.id,
        campaignId: campaign.id,
        startAt,
        endAt,
        status: "ACTIVE",
      },
      include: { package: true, campaign: true },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        providerProfile: { update: { visibility: Visibility.PUBLIC } },
      },
    });
    return {
      id: subscription.id,
      status: subscription.status,
      startAt: subscription.startAt,
      endAt: subscription.endAt,
      campaign: {
        id: campaign.id,
        nameAr: campaign.nameAr,
        nameEn: campaign.nameEn,
      },
      package: toPackage(subscription.package),
    };
  }

  async submitProof(userId: string, dto: SubmitPaymentProofDto) {
    await this.requireProvider(userId);
    if (!dto.transferText && !dto.storageKey) {
      throw new BadRequestException("أرسلي صورة الإيصال أو نص رسالة التحويل");
    }
    const pkg = await this.prisma.package.findFirst({
      where: { id: dto.packageId, isActive: true },
    });
    if (!pkg) {
      throw new BadRequestException("الباقة غير متاحة");
    }
    const months = await this.extensionMonths(pkg.durationMonths);
    const campaign = pkg.code === "FREE" ? await liveCampaign(this.prisma) : null;
    if (pkg.code === "FREE" && !campaign) {
      throw new BadRequestException("الحملة المجانية غير مفعّلة");
    }
    const startAt = new Date();
    const endAt = new Date(startAt);
    if (campaign) {
      endAt.setDate(endAt.getDate() + campaign.benefitDays);
    } else {
      endAt.setMonth(endAt.getMonth() + months);
    }
    const autoActivate = Boolean(campaign && pkg.code === "FREE");
    const subscription = await this.prisma.subscription.create({
      data: {
        providerUserId: userId,
        packageId: pkg.id,
        campaignId: campaign?.id,
        startAt,
        endAt,
        status: autoActivate ? "ACTIVE" : "PENDING",
      },
    });
    if (autoActivate) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: "ACTIVE",
          providerProfile: { update: { visibility: Visibility.PUBLIC } },
        },
      });
    }
    const kind = dto.kind ?? (dto.transferText ? "TEXT" : "IMAGE");
    const file = await this.prisma.mediaFile.create({
      data: {
        storageKey: (dto.storageKey || dto.transferText || `proof/${userId}/${Date.now()}`).slice(
          0,
          400,
        ),
        mime: dto.mime || (kind === "TEXT" ? "text/plain" : "image/jpeg"),
        sizeBytes: dto.sizeBytes ?? (dto.transferText ? dto.transferText.length : 0),
        kind,
        status: "PENDING",
        uploadedById: userId,
      },
    });
    const proof = await this.prisma.paymentProof.create({
      data: {
        subscriptionId: subscription.id,
        fileId: file.id,
        amount: dto.amount ?? pkg.price,
        opsStatus: "PENDING",
        financeStatus: "PENDING",
      },
      include: { file: true, subscription: { include: { package: true } } },
    });
    return this.toProof(proof);
  }

  async listProofs(userId: string) {
    const proofs = await this.prisma.paymentProof.findMany({
      where: { subscription: { providerUserId: userId } },
      include: { file: true, subscription: { include: { package: true } } },
      orderBy: { createdAt: "desc" },
    });
    return proofs.map((item) => this.toProof(item));
  }

  async ticketTypes() {
    return this.prisma.ticketType.findMany({
      where: { audience: AccountType.PROVIDER },
      orderBy: { code: "asc" },
    });
  }

  async listTickets(userId: string) {
    await this.requireProvider(userId);
    return this.prisma.ticket.findMany({
      where: { ownerId: userId },
      include: { type: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createTicket(userId: string, dto: CreateProviderTicketDto) {
    await this.requireProvider(userId);
    const type = await this.prisma.ticketType.findFirst({
      where: { code: dto.typeCode, audience: AccountType.PROVIDER },
    });
    if (!type) {
      throw new BadRequestException("نوع التذكرة غير متاح");
    }
    const count = await this.prisma.ticket.count();
    return this.prisma.ticket.create({
      data: {
        refNo: `BM-${String(count + 1).padStart(6, "0")}-${userId.slice(0, 4)}`,
        typeId: type.id,
        ownerId: userId,
        body: dto.body.trim(),
      },
      include: { type: true },
    });
  }

  private async currentSubscription(userId: string) {
    const row = await this.prisma.subscription.findFirst({
      where: { providerUserId: userId },
      include: { package: true },
      orderBy: [{ status: "asc" }, { endAt: "desc" }],
    });
    if (!row) {
      return null;
    }
    const active =
      row.status === "ACTIVE" && row.endAt >= new Date()
        ? row
        : await this.prisma.subscription.findFirst({
            where: {
              providerUserId: userId,
              status: "ACTIVE",
              endAt: { gte: new Date() },
            },
            include: { package: true },
            orderBy: { endAt: "desc" },
          });
    const chosen = active ?? row;
    return {
      id: chosen.id,
      status: chosen.status,
      startAt: chosen.startAt,
      endAt: chosen.endAt,
      package: toPackage(chosen.package),
    };
  }

  private async packageLimits(userId: string) {
    const current = await this.currentSubscription(userId);
    if (current?.package) {
      return {
        maxServices: current.package.maxServices,
        maxPhotos: current.package.maxPhotos,
        maxVideos: current.package.maxVideos,
      };
    }
    const free = await this.prisma.package.findUnique({ where: { code: "FREE" } });
    return {
      maxServices: free?.maxServices ?? 5,
      maxPhotos: free?.maxPhotos ?? 5,
      maxVideos: free?.maxVideos ?? 0,
    };
  }

  private toProof(proof: {
    id: string;
    amount: { toString(): string } | number;
    opsStatus: string;
    financeStatus: string;
    createdAt: Date;
    file: { kind: string; storageKey: string; mime: string };
    subscription: {
      id: string;
      status: string;
      package: {
        id: string;
        code: string;
        nameAr: string;
        nameEn: string;
        price: { toString(): string } | number;
        durationMonths: number;
        rank: number;
        maxServices: number | null;
        maxPhotos: number | null;
        maxVideos: number | null;
      };
    };
  }) {
    return {
      id: proof.id,
      amount: Number(proof.amount),
      opsStatus: proof.opsStatus,
      financeStatus: proof.financeStatus,
      createdAt: proof.createdAt,
      file: {
        kind: proof.file.kind,
        storageKey: proof.file.kind === "TEXT" ? proof.file.storageKey : proof.file.storageKey,
        mime: proof.file.mime,
      },
      subscription: {
        id: proof.subscription.id,
        status: proof.subscription.status,
        package: toPackage(proof.subscription.package),
      },
    };
  }

  private toPortfolioItem(item: {
    id: string;
    approvalStatus: string;
    sortOrder: number;
    file: { storageKey: string; mime: string; kind: string; status: string };
  }) {
    return {
      id: item.id,
      approvalStatus: item.approvalStatus,
      sortOrder: item.sortOrder,
      storageKey: item.file.storageKey,
      mime: item.file.mime,
      kind: item.file.kind,
      status: item.file.status,
      url: publicUploadUrl(item.file.storageKey),
    };
  }

  private async toProfile(user: Awaited<ReturnType<ProviderService["requireProvider"]>>) {
    const profile = user.providerProfile;
    const pending = await pendingChangesFor(this.prisma, user.id);
    const pendingAvatarId = pendingValue(pending, ProfileChangeField.AVATAR);
    const avatarId = pendingAvatarId || user.avatarFileId;
    let avatarUrl: string | null = null;
    if (avatarId) {
      const file = await this.prisma.mediaFile.findUnique({
        where: { id: avatarId },
      });
      avatarUrl = publicUploadUrl(file?.storageKey);
    }
    const pendingCityId = pendingValue(pending, ProfileChangeField.CITY);
    const city =
      pendingCityId && pendingCityId !== profile.cityId
        ? await this.prisma.city.findUnique({ where: { id: pendingCityId } })
        : profile.city;
    const services = await this.prisma.providerService.findMany({
      where: { providerUserId: user.id },
      select: { subServiceId: true, isPrimary: true },
    });
    return {
      id: user.id,
      displayName: pendingValue(pending, ProfileChangeField.DISPLAY_NAME) ?? user.displayName,
      mobile: user.mobile,
      email: pendingValue(pending, ProfileChangeField.EMAIL) ?? user.email,
      accountCode: user.accountCode,
      status: user.status,
      visibility: profile.visibility ?? Visibility.HIDDEN,
      bio: pendingValue(pending, ProfileChangeField.BIO) ?? profile.bio,
      whatsapp: pendingValue(pending, ProfileChangeField.WHATSAPP) ?? profile.whatsapp,
      badge: profile.badge,
      city,
      avatarUrl,
      coverage: profile.coverage.map((row) => row.coverageArea),
      hasRequiredServices: services.some((row) => row.subServiceId) && services.some((row) => row.isPrimary),
      pendingChanges: pending,
    };
  }

  private assertPrices(priceFrom?: number, priceTo?: number) {
    if (priceFrom != null && priceTo != null && priceFrom > priceTo) {
      throw new BadRequestException("السعر من يجب أن يكون أقل من أو يساوي السعر إلى");
    }
  }

  private async extensionMonths(fallback: number) {
    const months = await this.prisma.getSettingInt("package_extension_months", fallback);
    return months > 0 ? months : fallback;
  }

  private async requireProvider(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        providerProfile: {
          include: {
            city: true,
            coverage: { include: { coverageArea: true } },
          },
        },
      },
    });
    if (!user || user.accountType !== AccountType.PROVIDER) {
      throw new ForbiddenException("الحساب ليس حساب صانعة جمال");
    }
    if (!user.providerProfile) {
      throw new NotFoundException("الملف غير موجود");
    }
    await this.prisma.providerProfile.update({
      where: { userId },
      data: { lastAppearedAt: new Date() },
    });
    return user as typeof user & { providerProfile: NonNullable<typeof user.providerProfile> };
  }
}

function toSaudiMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("5")) {
    return `0${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("05")) {
    return digits;
  }
  if (digits.startsWith("966")) {
    const local = digits.slice(3);
    if (local.length === 9 && local.startsWith("5")) {
      return `0${local}`;
    }
    if (local.length === 10 && local.startsWith("05")) {
      return local;
    }
  }
  return digits;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toPackage(pkg: {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  price: { toString(): string } | number;
  durationMonths: number;
  rank: number;
  maxServices: number | null;
  maxPhotos: number | null;
  maxVideos: number | null;
  allowWhatsApp?: boolean;
  allowRating?: boolean;
  hasBadge?: boolean;
}) {
  return {
    id: pkg.id,
    code: pkg.code,
    nameAr: pkg.nameAr,
    nameEn: pkg.nameEn,
    price: Number(pkg.price),
    durationMonths: pkg.durationMonths,
    rank: pkg.rank,
    maxServices: pkg.maxServices,
    maxPhotos: pkg.maxPhotos,
    maxVideos: pkg.maxVideos,
    allowWhatsApp: pkg.allowWhatsApp ?? true,
    allowRating: pkg.allowRating ?? true,
    hasBadge: pkg.hasBadge ?? false,
  };
}
