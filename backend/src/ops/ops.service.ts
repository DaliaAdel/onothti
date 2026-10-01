import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileChangeField, Visibility } from "../common/enums";
import { assertUniqueDisplayName, assertUniqueEmail } from "../common/account-rules";
import { PatchCampaignDto, UpdateSettingDto, UpsertWelcomeDto } from "./dto/ops.dto";

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
      await this.prisma.providerProfile.update({
        where: { userId: change.userId },
        data: { cityId: change.newValue, visibility: Visibility.HIDDEN },
      });
    }
  }
}
