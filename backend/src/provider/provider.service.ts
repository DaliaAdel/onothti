import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AccountType, Visibility } from "../common/enums";
import { publicUploadUrl } from "../common/upload-url";
import { PrismaService } from "../prisma/prisma.service";
import {
  AddPortfolioDto,
  AddProviderServiceDto,
  CreateProviderTicketDto,
  SubmitPaymentProofDto,
  UpdateProviderProfileDto,
} from "./dto/provider.dto";

@Injectable()
export class ProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.requireProvider(userId);
    return this.toProfile(user);
  }

  async uploadAvatar(userId: string, file?: { filename: string; mimetype: string; size: number }) {
    await this.requireProvider(userId);
    if (!file) {
      throw new BadRequestException("اختاري صورة للحساب");
    }
    const media = await this.prisma.mediaFile.create({
      data: {
        storageKey: `avatars/${file.filename}`,
        mime: file.mimetype,
        sizeBytes: file.size,
        kind: "IMAGE",
        status: "APPROVED",
        uploadedById: userId,
      },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarFileId: media.id },
    });
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
    }
    let whatsapp = user.providerProfile.whatsapp;
    if (dto.whatsapp !== undefined) {
      const mobile = toSaudiMobile(dto.whatsapp);
      if (!/^05[0-9]{8}$/.test(mobile)) {
        throw new BadRequestException("رقم الجوال لازم يكون سعودي 10 أرقام ويبدأ بـ 05");
      }
      whatsapp = mobile;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName ? { displayName: dto.displayName } : {}),
        providerProfile: {
          update: {
            ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
            ...(dto.whatsapp !== undefined ? { whatsapp } : {}),
            ...(dto.cityId ? { cityId: dto.cityId } : {}),
          },
        },
      },
    });
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
    if (dto.subServiceId) {
      const sub = await this.prisma.subService.findFirst({
        where: { id: dto.subServiceId, serviceId: dto.serviceId, isVisible: true },
      });
      if (!sub) {
        throw new BadRequestException("الخدمة الفرعية غير متاحة");
      }
    }
    const limits = await this.packageLimits(userId);
    const count = await this.prisma.providerService.count({ where: { providerUserId: userId } });
    if (limits.maxServices != null && count >= limits.maxServices) {
      throw new ForbiddenException("تجاوزتِ حد الخدمات في باقتك");
    }
    try {
      return await this.prisma.providerService.create({
        data: {
          providerUserId: userId,
          serviceId: dto.serviceId,
          subServiceId: dto.subServiceId,
          sortOrder: count,
        },
        include: { service: true, subService: true },
      });
    } catch {
      throw new ConflictException("الخدمة مضافة بالفعل");
    }
  }

  async removeService(userId: string, id: string) {
    await this.requireProvider(userId);
    const deleted = await this.prisma.providerService.deleteMany({
      where: { id, providerUserId: userId },
    });
    if (deleted.count === 0) {
      throw new NotFoundException("الخدمة غير موجودة");
    }
    return { ok: true };
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
    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setMonth(endAt.getMonth() + pkg.durationMonths);
    const subscription = await this.prisma.subscription.create({
      data: {
        providerUserId: userId,
        packageId: pkg.id,
        startAt,
        endAt,
        status: "PENDING",
      },
    });
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
    let avatarUrl: string | null = null;
    if (user.avatarFileId) {
      const file = await this.prisma.mediaFile.findUnique({
        where: { id: user.avatarFileId },
      });
      avatarUrl = publicUploadUrl(file?.storageKey);
    }
    return {
      id: user.id,
      displayName: user.displayName,
      mobile: user.mobile,
      email: user.email,
      accountCode: user.accountCode,
      status: user.status,
      visibility: profile.visibility ?? Visibility.HIDDEN,
      bio: profile.bio,
      whatsapp: profile.whatsapp,
      badge: profile.badge,
      city: profile.city,
      avatarUrl,
    };
  }

  private async requireProvider(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { providerProfile: { include: { city: true } } },
    });
    if (!user || user.accountType !== AccountType.PROVIDER) {
      throw new ForbiddenException("الحساب ليس حساب صانعة جمال");
    }
    if (!user.providerProfile) {
      throw new NotFoundException("الملف غير موجود");
    }
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
