import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileChangeField, Visibility } from "../common/enums";
import { assertUniqueDisplayName, assertUniqueEmail } from "../common/account-rules";
import {
  CreateCityDto,
  PatchCampaignDto,
  PatchCityDto,
  PatchRegionDto,
  UpdateSettingDto,
  UpsertRegionDto,
  UpsertWelcomeDto,
} from "./dto/ops.dto";
import { parseCityIds, replaceProviderCities } from "../common/geo";

@Injectable()
export class OpsService {
  constructor(private readonly prisma: PrismaService) {}

  settings() {
    return this.prisma.setting.findMany({ orderBy: { key: "asc" } });
  }

  async upsertSetting(dto: UpdateSettingDto) {
    return this.prisma.setting.upsert({
      where: { key: dto.key },
      update: { value: dto.value },
      create: { key: dto.key, value: dto.value },
    });
  }

  campaigns() {
    return this.prisma.campaign.findMany({ orderBy: { startDate: "desc" } });
  }

  async patchCampaign(id: string, dto: PatchCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new NotFoundException("الحملة غير موجودة");
    }
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.startDate ? { startDate: dto.startDate } : {}),
        ...(dto.endDate ? { endDate: dto.endDate } : {}),
        ...(dto.benefitDays ? { benefitDays: dto.benefitDays } : {}),
      },
    });
  }

  welcomeMessages() {
    return this.prisma.welcomeMessage.findMany({ orderBy: { kind: "asc" } });
  }

  createWelcome(dto: UpsertWelcomeDto) {
    return this.prisma.welcomeMessage.create({
      data: {
        audience: dto.audience,
        kind: dto.kind,
        bodyAr: dto.bodyAr,
        bodyEn: dto.bodyEn ?? "",
        isActive: dto.isActive ?? true,
      },
    });
  }

  async patchWelcome(id: string, dto: UpsertWelcomeDto) {
    const row = await this.prisma.welcomeMessage.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("الرسالة غير موجودة");
    }
    return this.prisma.welcomeMessage.update({
      where: { id },
      data: {
        audience: dto.audience,
        kind: dto.kind,
        bodyAr: dto.bodyAr,
        bodyEn: dto.bodyEn ?? row.bodyEn,
        isActive: dto.isActive ?? row.isActive,
      },
    });
  }

  profileChanges(status = "PENDING") {
    return this.prisma.profileChangeRequest.findMany({
      where: { status },
      include: {
        user: {
          select: { id: true, displayName: true, accountType: true, accountCode: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async reviewChange(id: string, approve: boolean) {
    const change = await this.prisma.profileChangeRequest.findUnique({
      where: { id },
      include: { user: { include: { providerProfile: true } } },
    });
    if (!change) {
      throw new NotFoundException("طلب التعديل غير موجود");
    }
    if (change.status !== "PENDING") {
      throw new BadRequestException("الطلب تمت مراجعته");
    }
    if (approve) {
      await this.applyChange(change);
    }
    return this.prisma.profileChangeRequest.update({
      where: { id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        reviewedAt: new Date(),
      },
    });
  }

  complaints() {
    return this.prisma.complaint.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  regions() {
    return this.prisma.region.findMany({
      include: { cities: { orderBy: { nameAr: "asc" } } },
      orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
    });
  }

  async createRegion(dto: UpsertRegionDto) {
    return this.prisma.region
      .create({
        data: {
          code: dto.code.trim().toUpperCase(),
          nameAr: dto.nameAr.trim(),
          nameEn: (dto.nameEn ?? dto.nameAr).trim(),
          isVisible: dto.isVisible ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
        include: { cities: true },
      })
      .catch((error: unknown) => this.rethrowUnique(error, "رمز المنطقة مستخدم"));
  }

  async patchRegion(id: string, dto: PatchRegionDto) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) {
      throw new NotFoundException("المنطقة غير موجودة");
    }
    return this.prisma.region.update({
      where: { id },
      data: {
        ...(dto.nameAr ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: { cities: { orderBy: { nameAr: "asc" } } },
    });
  }

  cities() {
    return this.prisma.city.findMany({
      include: { region: true },
      orderBy: [{ region: { nameAr: "asc" } }, { nameAr: "asc" }],
    });
  }

  async createCity(dto: CreateCityDto) {
    const region = await this.prisma.region.findUnique({ where: { id: dto.regionId } });
    if (!region) {
      throw new NotFoundException("المنطقة غير موجودة");
    }
    return this.prisma.city
      .create({
        data: {
          regionId: dto.regionId,
          code: dto.code.trim().toUpperCase(),
          nameAr: dto.nameAr.trim(),
          nameEn: (dto.nameEn ?? dto.nameAr).trim(),
          isVisible: dto.isVisible ?? true,
        },
        include: { region: true },
      })
      .catch((error: unknown) => this.rethrowUnique(error, "رمز المدينة مستخدم"));
  }

  async patchCity(id: string, dto: PatchCityDto) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) {
      throw new NotFoundException("المدينة غير موجودة");
    }
    if (dto.regionId && dto.regionId !== city.regionId) {
      const region = await this.prisma.region.findUnique({ where: { id: dto.regionId } });
      if (!region) {
        throw new NotFoundException("المنطقة غير موجودة");
      }
    }
    return this.prisma.city.update({
      where: { id },
      data: {
        ...(dto.regionId ? { regionId: dto.regionId } : {}),
        ...(dto.nameAr ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
      },
      include: { region: true },
    });
  }

  private rethrowUnique(error: unknown, message: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException(message);
    }
    throw error;
  }

  private async applyChange(change: {
    userId: string;
    field: string;
    newValue: string;
    user: {
      accountType: string;
      providerProfile: { userId: string } | null;
    };
  }) {
    if (change.field === ProfileChangeField.DISPLAY_NAME) {
      const name = await assertUniqueDisplayName(
        this.prisma,
        change.user.accountType,
        change.newValue,
        change.userId,
      );
      await this.prisma.user.update({ where: { id: change.userId }, data: { displayName: name } });
      return;
    }
    if (change.field === ProfileChangeField.EMAIL) {
      const email = await assertUniqueEmail(this.prisma, change.newValue || null, change.userId);
      await this.prisma.user.update({ where: { id: change.userId }, data: { email } });
      return;
    }
    if (change.field === ProfileChangeField.AVATAR) {
      await this.prisma.mediaFile.update({
        where: { id: change.newValue },
        data: { status: "APPROVED" },
      });
      await this.prisma.user.update({
        where: { id: change.userId },
        data: { avatarFileId: change.newValue },
      });
      return;
    }
    if (!change.user.providerProfile) {
      return;
    }
    if (change.field === ProfileChangeField.BIO) {
      await this.prisma.providerProfile.update({
        where: { userId: change.userId },
        data: { bio: change.newValue },
      });
      return;
    }
    if (change.field === ProfileChangeField.WHATSAPP) {
      await this.prisma.providerProfile.update({
        where: { userId: change.userId },
        data: { whatsapp: change.newValue },
      });
      return;
    }
    if (change.field === ProfileChangeField.CITY) {
      const cityIds = parseCityIds(change.newValue);
      if (!cityIds.length) {
        throw new BadRequestException("المدن غير صحيحة");
      }
      await replaceProviderCities(this.prisma, change.userId, cityIds);
      await this.prisma.providerProfile.update({
        where: { userId: change.userId },
        data: { visibility: Visibility.HIDDEN },
      });
    }
  }
}
