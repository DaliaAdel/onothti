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
  CreatePortfolioAlbumDto,
  CreateProviderTicketDto,
  PatchPortfolioAlbumDto,
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
import { assertVisibleCitiesInSameRegion, orderedCitiesFromRows, parseCityIds, resolveCityIds, serializeCityIds } from "../common/geo";
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
    const cityIds = resolveCityIds(dto.cityId, dto.cityIds);
    if (cityIds.length) {
      const cities = await assertVisibleCitiesInSameRegion(this.prisma, cityIds);
      const currentIds = (user.providerProfile.cities ?? []).map((row) => row.cityId);
      if (!currentIds.length && user.providerProfile.cityId) {
        currentIds.push(user.providerProfile.cityId);
      }
      await queueProfileChange(
        this.prisma,
        userId,
        ProfileChangeField.CITY,
        serializeCityIds(currentIds),
        serializeCityIds(cities.map((city) => city.id)),
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
      this.prisma.providerService.count({ where: { providerUserId: userId, isActive: true } }),
    ]);
    const photosApproved = photos.filter((item) => item.approvalStatus === "APPROVED").length;
    const photosPending = photos.filter((item) => item.approvalStatus === "PENDING").length;
    const completion = [
      Boolean(profile.displayName),
      Boolean(profile.city),
      Boolean(profile.mobile),
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

  async reorderServices(userId: string, ids: string[]) {
    await this.requireProvider(userId);
    const uniqueIds = [...new Set(ids)];
    const existing = await this.prisma.providerService.findMany({
      where: { providerUserId: userId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((row) => row.id));
    if (uniqueIds.length !== existing.length || uniqueIds.some((id) => !existingIds.has(id))) {
      throw new BadRequestException("ترتيب الخدمات غير صالح");
    }
    await this.prisma.$transaction(
      uniqueIds.map((id, index) =>
        this.prisma.providerService.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.listServices(userId);
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
    if (dto.isActive === false && row.isPrimary) {
      const next = await this.prisma.providerService.findFirst({
        where: { providerUserId: userId, id: { not: id }, isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      if (next) {
        await this.prisma.providerService.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }
    return this.prisma.providerService.update({
      where: { id },
      data: {
        ...(dto.priceFrom !== undefined ? { priceFrom: dto.priceFrom } : {}),
        ...(dto.priceTo !== undefined ? { priceTo: dto.priceTo } : {}),
        ...(dto.isPrimary ? { isPrimary: true } : {}),
        ...(dto.isActive !== undefined
          ? { isActive: dto.isActive, ...(dto.isActive === false ? { isPrimary: false } : {}) }
          : {}),
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
    const cityIds =
      user.providerProfile.cities?.length
        ? user.providerProfile.cities.map((row) => row.cityId)
        : user.providerProfile.cityId
          ? [user.providerProfile.cityId]
          : [];
    const areas = await this.prisma.coverageArea.findMany({
      where: {
        id: { in: dto.areaIds },
        isVisible: true,
        ...(cityIds.length ? { cityId: { in: cityIds } } : {}),
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

  async listPortfolio(userId: string, albumId?: string) {
    await this.requireProvider(userId);
    const items = await this.prisma.portfolioItem.findMany({
      where: {
        providerUserId: userId,
        ...(albumId === "unfiled" ? { albumId: null } : albumId ? { albumId } : {}),
      },
      include: { file: true },
      orderBy: { sortOrder: "asc" },
    });
    return items.map((item) => this.toPortfolioItem(item));
  }

  async listAlbums(userId: string) {
    await this.requireProvider(userId);
    const albums = await this.prisma.portfolioAlbum.findMany({
      where: { providerUserId: userId },
      include: { items: { include: { file: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    const unfiled = await this.prisma.portfolioItem.findMany({
      where: { providerUserId: userId, albumId: null },
      include: { file: true },
      orderBy: { sortOrder: "asc" },
    });
    const mapped = albums.map((album, index) => this.toAlbum(album, index));
    if (unfiled.length) {
      mapped.push({
        id: "unfiled",
        name: "أعمال بدون ألبوم",
        isActive: true,
        sortOrder: mapped.length,
        itemCount: unfiled.length,
        photoCount: unfiled.filter((item) => item.file.kind === "IMAGE").length,
        coverUrl: publicUploadUrl(unfiled.find((item) => item.file.kind === "IMAGE")?.file.storageKey),
        virtual: true,
      });
    }
    return mapped;
  }

  async createAlbum(userId: string, dto: CreatePortfolioAlbumDto) {
    await this.requireProvider(userId);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("اكتبي اسم الألبوم");
    }
    const limits = await this.packageLimits(userId);
    const count = await this.prisma.portfolioAlbum.count({ where: { providerUserId: userId } });
    if (limits.maxAlbums != null && count >= limits.maxAlbums) {
      throw new ForbiddenException("تجاوزتِ حد الألبومات في باقتك");
    }
    const album = await this.prisma.portfolioAlbum.create({
      data: {
        providerUserId: userId,
        name,
        sortOrder: count,
      },
      include: { items: { include: { file: true } } },
    });
    return this.toAlbum(album, count);
  }

  async getAlbum(userId: string, id: string) {
    await this.requireProvider(userId);
    if (id === "unfiled") {
      const items = await this.listPortfolio(userId, "unfiled");
      return {
        album: {
          id: "unfiled",
          name: "أعمال بدون ألبوم",
          isActive: true,
          sortOrder: 0,
          itemCount: items.length,
          photoCount: items.filter((item) => item.kind !== "VIDEO").length,
          coverUrl: items.find((item) => item.kind !== "VIDEO")?.url ?? null,
          virtual: true,
        },
        items,
      };
    }
    const album = await this.prisma.portfolioAlbum.findFirst({
      where: { id, providerUserId: userId },
      include: { items: { include: { file: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!album) {
      throw new NotFoundException("الألبوم غير موجود");
    }
    return {
      album: this.toAlbum(album),
      items: album.items.map((item) => this.toPortfolioItem(item)),
    };
  }

  async patchAlbum(userId: string, id: string, dto: PatchPortfolioAlbumDto) {
    await this.requireProvider(userId);
    if (id === "unfiled") {
      throw new BadRequestException("لا يمكن تعديل هذا الألبوم");
    }
    const album = await this.prisma.portfolioAlbum.findFirst({
      where: { id, providerUserId: userId },
    });
    if (!album) {
      throw new NotFoundException("الألبوم غير موجود");
    }
    const updated = await this.prisma.portfolioAlbum.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { items: { include: { file: true }, orderBy: { sortOrder: "asc" } } },
    });
    return this.toAlbum(updated);
  }

  async removeAlbum(userId: string, id: string) {
    await this.requireProvider(userId);
    if (id === "unfiled") {
      throw new BadRequestException("لا يمكن حذف هذا الألبوم");
    }
    const album = await this.prisma.portfolioAlbum.findFirst({
      where: { id, providerUserId: userId },
    });
    if (!album) {
      throw new NotFoundException("الألبوم غير موجود");
    }
    await this.prisma.portfolioAlbum.delete({ where: { id } });
    return { ok: true };
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
    let albumId: string | undefined;
    if (dto.albumId && dto.albumId !== "unfiled") {
      const album = await this.prisma.portfolioAlbum.findFirst({
        where: { id: dto.albumId, providerUserId: userId },
      });
      if (!album) {
        throw new BadRequestException("الألبوم غير موجود");
      }
      albumId = album.id;
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
        albumId,
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
    const reference = dto.reference?.trim();
    const transferText = [dto.transferText?.trim(), reference ? `مرجع التحويل: ${reference}` : ""]
      .filter(Boolean)
      .join("\n\n");
    const storageKey = (
      dto.storageKey
        ? [dto.storageKey, reference ? `ref:${reference}` : ""].filter(Boolean).join(" | ")
        : transferText || `proof/${userId}/${Date.now()}`
    ).slice(0, 400);
    const file = await this.prisma.mediaFile.create({
      data: {
        storageKey,
        mime: dto.mime || (kind === "TEXT" ? "text/plain" : "image/jpeg"),
        sizeBytes: dto.sizeBytes ?? (transferText ? transferText.length : 0),
        kind,
        status: "PENDING",
        uploadedById: userId,
      },
    });
    const proof = await this.prisma.paymentProof.create({
      data: {
        subscriptionId: subscription.id,
        fileId: file.id,
        amount: Number(dto.amount || pkg.price),
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
        maxAlbums: current.package.maxAlbums,
      };
    }
    const free = await this.prisma.package.findUnique({ where: { code: "FREE" } });
    return {
      maxServices: free?.maxServices ?? 5,
      maxPhotos: free?.maxPhotos ?? 5,
      maxVideos: free?.maxVideos ?? 0,
      maxAlbums: free?.maxAlbums ?? 1,
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
      startAt: Date;
      endAt: Date;
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
        startAt: proof.subscription.startAt,
        endAt: proof.subscription.endAt,
        package: toPackage(proof.subscription.package),
      },
    };
  }

  private toPortfolioItem(item: {
    id: string;
    albumId?: string | null;
    approvalStatus: string;
    sortOrder: number;
    file: { storageKey: string; mime: string; kind: string; status: string };
  }) {
    return {
      id: item.id,
      albumId: item.albumId ?? null,
      approvalStatus: item.approvalStatus,
      sortOrder: item.sortOrder,
      storageKey: item.file.storageKey,
      mime: item.file.mime,
      kind: item.file.kind,
      status: item.file.status,
      url: publicUploadUrl(item.file.storageKey),
    };
  }

  private toAlbum(
    album: {
      id: string;
      name: string;
      isActive: boolean;
      sortOrder: number;
      items: { file: { kind: string; storageKey: string } }[];
    },
    index?: number,
  ) {
    const photos = album.items.filter((item) => item.file.kind === "IMAGE");
    return {
      id: album.id,
      name: album.name,
      isActive: album.isActive,
      sortOrder: index ?? album.sortOrder,
      itemCount: album.items.length,
      photoCount: photos.length,
      coverUrl: publicUploadUrl(photos[0]?.file.storageKey),
      virtual: false,
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
    const pendingCityRaw = pendingValue(pending, ProfileChangeField.CITY);
    const pendingCityIds = parseCityIds(pendingCityRaw);
    const savedGeo = orderedCitiesFromRows(profile.cities ?? [], profile.city);
    let geo = savedGeo;
    if (pendingCityIds.length) {
      const pendingCities = await this.prisma.city.findMany({
        where: { id: { in: pendingCityIds } },
        include: { region: true },
      });
      const byId = new Map(pendingCities.map((city) => [city.id, city]));
      geo = orderedCitiesFromRows(
        pendingCityIds
          .filter((id) => byId.has(id))
          .map((id, sortOrder) => ({ city: byId.get(id)!, sortOrder })),
        pendingCities[0] ?? profile.city,
      );
    }
    const services = await this.prisma.providerService.findMany({
      where: { providerUserId: user.id },
      select: { subServiceId: true, isPrimary: true, isActive: true },
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
      whatsapp: user.mobile,
      badge: profile.badge,
      city: geo.city,
      cities: geo.cities,
      region: geo.region,
      avatarUrl,
      coverage: profile.coverage.map((row) => row.coverageArea),
      hasRequiredServices:
        services.some((row) => row.subServiceId && row.isActive) &&
        services.some((row) => row.isPrimary && row.isActive),
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
            city: { include: { region: true } },
            coverage: { include: { coverageArea: true } },
            cities: {
              include: { city: { include: { region: true } } },
              orderBy: { sortOrder: "asc" },
            },
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
  maxAlbums?: number | null;
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
    maxAlbums: pkg.maxAlbums ?? null,
    allowWhatsApp: pkg.allowWhatsApp ?? true,
    allowRating: pkg.allowRating ?? true,
    hasBadge: pkg.hasBadge ?? false,
  };
}
