import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileChangeField, Visibility, AccountStatus, AccountType, StaffPermission } from "../common/enums";
import { assertUniqueDisplayName, assertUniqueEmail } from "../common/account-rules";
import {
  CreateCityDto,
  PatchCampaignDto,
  PatchCityDto,
  PatchRegionDto,
  UpdateSettingDto,
  UpsertRegionDto,
  UpsertWelcomeDto,
  ReviewMediaDto,
  ReviewProviderDto,
  UpsertPackageDto,
  PatchPackageDto,
  CreateCampaignDto,
  ReviewRatingDto,
  PatchComplaintDto,
  CreateStaffDto,
  PatchStaffDto,
  PatchRolePermissionsDto,
  PatchLegalDto,
  UpsertServiceDto,
  PatchServiceDto,
  UpsertSubServiceDto,
  PatchSubServiceDto,
  UpsertCoverageDto,
  PatchCoverageDto,
  UpsertBankDto,
  PatchBankDto,
  CreateBannedPhoneDto,
  PatchTicketDto,
  CreateTicketCommentDto,
  PatchAccountDto,
  BroadcastDto,
} from "./dto/ops.dto";
import { parseCityIds, replaceProviderCities } from "../common/geo";
import { fileUrl } from "../common/upload-url";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

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
          select: {
            id: true,
            displayName: true,
            accountType: true,
            accountCode: true,
            mobile: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
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
    await this.notifyOwner(
      change.userId,
      approve ? "تم اعتماد تعديل الملف" : "تم رفض تعديل الملف",
      approve ? "اعتمد المشغّل التعديل على ملفك" : "لم يُعتمد التعديل المطلوب على الملف",
    );
    return this.prisma.profileChangeRequest.update({
      where: { id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        reviewedAt: new Date(),
      },
    });
  }

  complaints(status?: string) {
    return this.prisma.complaint.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: {
          select: { id: true, displayName: true, accountType: true, accountCode: true, mobile: true },
        },
        target: {
          select: { id: true, displayName: true, accountType: true, accountCode: true, mobile: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async patchComplaint(id: string, dto: PatchComplaintDto) {
    const row = await this.prisma.complaint.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("البلاغ غير موجود");
    }
    const updated = await this.prisma.complaint.update({
      where: { id },
      data: { status: dto.status },
      include: {
        reporter: { select: { id: true, displayName: true, accountType: true, accountCode: true } },
        target: { select: { id: true, displayName: true, accountType: true, accountCode: true } },
      },
    });
    const title =
      dto.status === "CLOSED" ? "تم إغلاق البلاغ" : dto.status === "ESCALATED" ? "تم تصعيد البلاغ" : "تحديث البلاغ";
    await this.notifyOwner(row.reporterId, title, dto.note?.trim() || title);
    if (row.targetUserId && dto.status === "CLOSED") {
      await this.notifyOwner(row.targetUserId, "تم إغلاق بلاغ مرتبط بحسابك", dto.note?.trim() || title);
    }
    return updated;
  }

  async ratings(status = "PENDING") {
    const filter = status?.trim() || "PENDING";
    return this.prisma.rating.findMany({
      where: { status: filter },
      include: {
        customer: {
          select: { id: true, displayName: true, accountCode: true, mobile: true },
        },
        provider: {
          select: { id: true, displayName: true, accountCode: true, mobile: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
  }

  async reviewRating(id: string, dto: ReviewRatingDto) {
    const rating = await this.prisma.rating.findUnique({ where: { id } });
    if (!rating) {
      throw new NotFoundException("التقييم غير موجود");
    }
    if (rating.status !== "PENDING") {
      throw new BadRequestException("التقييم تمت مراجعته");
    }
    const status = dto.approve ? "APPROVED" : "REJECTED";
    const updated = await this.prisma.rating.update({
      where: { id },
      data: { status },
    });
    await this.notifyOwner(
      rating.providerUserId,
      dto.approve ? "تم اعتماد تقييم جديد" : "رُفض تقييم على ملفك",
      dto.note?.trim() || (dto.approve ? "ظهر تقييم جديد بعد المراجعة" : "لم يُعتمد التقييم"),
    );
    await this.notifyOwner(
      rating.customerUserId,
      dto.approve ? "تم نشر تقييمك" : "لم يُعتمد تقييمك",
      dto.note?.trim() || (dto.approve ? "سيظهر تقييمك في ملف الخبيرة" : "المراجعة لم تعتمد التقييم"),
    );
    return updated;
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        staff: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user?.staff) {
      throw new NotFoundException("حساب التشغيل غير موجود");
    }
    return this.toStaff(user);
  }

  roles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { nameAr: "asc" },
    });
  }

  permissionsCatalog() {
    return this.prisma.permission.findMany({ orderBy: { nameAr: "asc" } });
  }

  async patchRolePermissions(id: string, dto: PatchRolePermissionsDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundException("الدور غير موجود");
    }
    const uniqueCodes = [...new Set(dto.permissionCodes.map((code) => code.trim()).filter(Boolean))];
    const catalog = await this.prisma.permission.findMany({
      where: { code: { in: uniqueCodes } },
    });
    if (catalog.length !== uniqueCodes.length) {
      throw new BadRequestException("صلاحية غير معروفة");
    }
    const nextHasUsers = uniqueCodes.includes(StaffPermission.USERS_MANAGE);
    const currentlyHasUsers = role.permissions.some((row) => row.permission.code === StaffPermission.USERS_MANAGE);
    if (currentlyHasUsers && !nextHasUsers) {
      const managers = await this.prisma.staffUser.count({
        where: {
          user: { accountType: AccountType.STAFF, status: AccountStatus.ACTIVE },
          role: { permissions: { some: { permission: { code: StaffPermission.USERS_MANAGE } } } },
          roleId: { not: id },
        },
      });
      const onThisRole = await this.prisma.staffUser.count({
        where: {
          roleId: id,
          user: { accountType: AccountType.STAFF, status: AccountStatus.ACTIVE },
        },
      });
      if (managers === 0 && onThisRole > 0) {
        throw new BadRequestException("لا يمكن إزالة إدارة المستخدمين من آخر دور يملكها");
      }
    }
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (catalog.length) {
      await this.prisma.rolePermission.createMany({
        data: catalog.map((permission) => ({ roleId: id, permissionId: permission.id })),
      });
    }
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  }

  legalPages() {
    return this.prisma.legalPage.findMany({ orderBy: { code: "asc" } });
  }

  async patchLegal(id: string, dto: PatchLegalDto) {
    const page = await this.prisma.legalPage.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException("الصفحة غير موجودة");
    }
    const updated = await this.prisma.legalPage.update({
      where: { id },
      data: {
        titleAr: dto.titleAr.trim(),
        bodyAr: dto.bodyAr.trim(),
        ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn.trim() } : {}),
        ...(dto.bodyEn !== undefined ? { bodyEn: dto.bodyEn.trim() } : {}),
        version: page.version + 1,
      },
    });
    if (page.code.startsWith("TERMS_")) {
      const current = await this.prisma.getSettingInt("terms_version", 1);
      await this.prisma.setting.upsert({
        where: { key: "terms_version" },
        update: { value: String(current + 1) },
        create: { key: "terms_version", value: String(current + 1) },
      });
    }
    return updated;
  }

  catalog() {
    return this.prisma.service.findMany({
      include: { subServices: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createService(dto: UpsertServiceDto) {
    return this.prisma.service
      .create({
        data: {
          code: dto.code.trim().toUpperCase(),
          nameAr: dto.nameAr.trim(),
          nameEn: (dto.nameEn ?? dto.nameAr).trim(),
          sortOrder: dto.sortOrder ?? 0,
          isVisible: dto.isVisible ?? true,
        },
        include: { subServices: true },
      })
      .catch((error: unknown) => this.rethrowUnique(error, "رمز الخدمة مستخدم"));
  }

  async patchService(id: string, dto: PatchServiceDto) {
    const row = await this.prisma.service.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("الخدمة غير موجودة");
    }
    return this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.nameAr ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
      },
      include: { subServices: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async createSubService(serviceId: string, dto: UpsertSubServiceDto) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      throw new NotFoundException("الخدمة غير موجودة");
    }
    return this.prisma.subService
      .create({
        data: {
          serviceId,
          code: dto.code.trim().toUpperCase(),
          nameAr: dto.nameAr.trim(),
          nameEn: (dto.nameEn ?? dto.nameAr).trim(),
          sortOrder: dto.sortOrder ?? 0,
          isVisible: dto.isVisible ?? true,
        },
      })
      .catch((error: unknown) => this.rethrowUnique(error, "رمز الخدمة الفرعية مستخدم"));
  }

  async patchSubService(id: string, dto: PatchSubServiceDto) {
    const row = await this.prisma.subService.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("الخدمة الفرعية غير موجودة");
    }
    return this.prisma.subService.update({
      where: { id },
      data: {
        ...(dto.nameAr ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
      },
    });
  }

  tickets(status?: string) {
    return this.prisma.ticket.findMany({
      where: status ? { status } : undefined,
      include: this.ticketInclude,
      orderBy: { createdAt: "asc" },
      take: 200,
    });
  }

  async patchTicket(id: string, dto: PatchTicketDto, actorId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("الطلب غير موجود");
    }
    await this.prisma.ticket.update({
      where: { id },
      data: { status: dto.status, assigneeId: actorId },
    });
    await this.notifyOwner(
      ticket.ownerId,
      dto.status === "CLOSED" || dto.status === "RESOLVED" ? "تم إغلاق طلبك" : "تحديث على طلبك",
      this.ticketStatusLabel(dto.status),
    );
    return this.ticketById(id);
  }

  async commentTicket(id: string, dto: CreateTicketCommentDto, actorId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("الطلب غير موجود");
    }
    await this.prisma.ticketComment.create({
      data: { ticketId: id, authorId: actorId, body: dto.body.trim() },
    });
    if (ticket.status === "SENT") {
      await this.prisma.ticket.update({
        where: { id },
        data: { status: "IN_PROGRESS", assigneeId: actorId },
      });
    }
    await this.notifyOwner(ticket.ownerId, "رد على طلبك", dto.body.trim().slice(0, 160));
    return this.ticketById(id);
  }

  bankAccounts() {
    return this.prisma.bankAccount.findMany({ orderBy: { bankName: "asc" } });
  }

  createBank(dto: UpsertBankDto) {
    return this.prisma.bankAccount.create({
      data: {
        bankName: dto.bankName.trim(),
        iban: dto.iban.trim().replace(/\s+/g, ""),
        accountName: dto.accountName.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async patchBank(id: string, dto: PatchBankDto) {
    const row = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("الحساب البنكي غير موجود");
    }
    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        ...(dto.bankName ? { bankName: dto.bankName.trim() } : {}),
        ...(dto.iban ? { iban: dto.iban.trim().replace(/\s+/g, "") } : {}),
        ...(dto.accountName ? { accountName: dto.accountName.trim() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  bannedPhones() {
    return this.prisma.bannedPhone.findMany({
      include: { createdBy: { select: { displayName: true, accountCode: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async banPhone(dto: CreateBannedPhoneDto, actorId: string) {
    return this.prisma.bannedPhone
      .create({
        data: {
          mobile: dto.mobile,
          reason: dto.reason.trim(),
          createdById: actorId,
        },
      })
      .catch((error: unknown) => this.rethrowUnique(error, "الرقم محظور مسبقًا"));
  }

  async unbanPhone(mobile: string) {
    const row = await this.prisma.bannedPhone.findUnique({ where: { mobile } });
    if (!row) {
      throw new NotFoundException("الرقم غير محظور");
    }
    await this.prisma.bannedPhone.delete({ where: { mobile } });
    return { ok: true };
  }

  async createCoverage(dto: UpsertCoverageDto) {
    const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
    if (!city) {
      throw new NotFoundException("المدينة غير موجودة");
    }
    return this.prisma.coverageArea
      .create({
        data: {
          cityId: dto.cityId,
          code: dto.code.trim().toUpperCase(),
          nameAr: dto.nameAr.trim(),
          nameEn: (dto.nameEn ?? dto.nameAr).trim(),
          isVisible: dto.isVisible ?? true,
        },
      })
      .catch((error: unknown) => this.rethrowUnique(error, "رمز منطقة التغطية مستخدم"));
  }

  async patchCoverage(id: string, dto: PatchCoverageDto) {
    const row = await this.prisma.coverageArea.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("منطقة التغطية غير موجودة");
    }
    return this.prisma.coverageArea.update({
      where: { id },
      data: {
        ...(dto.nameAr ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
      },
    });
  }

  accounts(query: { q?: string; accountType?: string; status?: string }) {
    const q = query.q?.trim();
    return this.prisma.user.findMany({
      where: {
        accountType: query.accountType
          ? query.accountType
          : { in: [AccountType.CUSTOMER, AccountType.PROVIDER] },
        ...(query.status ? { status: query.status } : { status: { not: AccountStatus.DELETED } }),
        ...(q
          ? {
              OR: [
                { displayName: { contains: q } },
                { mobile: { contains: q } },
                { accountCode: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        customerProfile: { include: { city: true } },
        providerProfile: { include: { city: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async patchAccount(id: string, dto: PatchAccountDto, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { providerProfile: true },
    });
    if (!user || user.accountType === AccountType.STAFF) {
      throw new NotFoundException("الحساب غير موجود");
    }
    const hide =
      dto.status === AccountStatus.RESTRICTED ||
      dto.status === AccountStatus.SUSPENDED ||
      dto.status === AccountStatus.CANCELLED ||
      dto.status === AccountStatus.DELETED;
    const visibility = hide ? Visibility.HIDDEN : dto.visibility;
    await this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status,
        ...(user.providerProfile && visibility
          ? { providerProfile: { update: { visibility } } }
          : {}),
        statusHistory: {
          create: {
            fromStatus: user.status,
            toStatus: dto.status,
            reason: dto.reason?.trim() || "ops-account",
            actorId,
          },
        },
      },
    });
    await this.notifyOwner(
      id,
      "تحديث حالة الحساب",
      dto.reason?.trim() || `أصبحت حالة الحساب: ${this.accountStatusLabel(dto.status)}`,
    );
    const rows = await this.accounts({ q: user.accountCode });
    return rows[0] ?? { id, status: dto.status };
  }

  async broadcast(dto: BroadcastDto) {
    const users = await this.prisma.user.findMany({
      where: {
        accountType:
          dto.audience === "ALL"
            ? { in: [AccountType.CUSTOMER, AccountType.PROVIDER] }
            : dto.audience,
        status: { notIn: [AccountStatus.DELETED, AccountStatus.CANCELLED] },
      },
      select: { id: true },
    });
    if (users.length) {
      await this.prisma.notification.createMany({
        data: users.map((user) => ({
          userId: user.id,
          audience: dto.audience,
          type: "SYSTEM",
          titleAr: dto.titleAr.trim(),
          titleEn: (dto.titleEn ?? dto.titleAr).trim(),
          bodyAr: dto.bodyAr.trim(),
          bodyEn: (dto.bodyEn ?? dto.bodyAr).trim(),
          status: "SENT",
        })),
      });
    }
    return { sent: users.length };
  }

  async staffUsers() {
    const rows = await this.prisma.user.findMany({
      where: { accountType: AccountType.STAFF, status: { not: AccountStatus.DELETED } },
      include: {
        staff: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.filter((row) => row.staff).map((row) => this.toStaff(row));
  }

  async createStaff(dto: CreateStaffDto) {
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundException("الدور غير موجود");
    }
    const existing = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
    if (existing) {
      throw new ConflictException("رقم الجوال مسجل بالفعل");
    }
    const displayName = await assertUniqueDisplayName(this.prisma, AccountType.STAFF, dto.displayName);
    const count = await this.prisma.user.count({ where: { accountType: AccountType.STAFF } });
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 12);
    const user = await this.prisma.user.create({
      data: {
        accountType: AccountType.STAFF,
        mobile: dto.mobile,
        passwordHash,
        status: AccountStatus.ACTIVE,
        displayName,
        accountCode: this.prisma.nextAccountCode(AccountType.STAFF, count),
        mobileVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
        staff: {
          create: {
            roleId: role.id,
            team: dto.team?.trim() || "OPS",
            level: role.code === "ADMIN" ? 3 : role.code === "OPS_LEAD" ? 2 : 1,
          },
        },
      },
      include: {
        staff: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    return this.toStaff(user);
  }

  async patchStaff(id: string, dto: PatchStaffDto, actorId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, accountType: AccountType.STAFF },
      include: {
        staff: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user?.staff) {
      throw new NotFoundException("حساب التشغيل غير موجود");
    }
    if (dto.status === "SUSPENDED" && id === actorId) {
      throw new BadRequestException("لا يمكن إيقاف حسابكِ الحالي");
    }
    let roleId = user.staff.roleId;
    if (dto.roleId && dto.roleId !== user.staff.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
        include: { permissions: { include: { permission: true } } },
      });
      if (!role) {
        throw new NotFoundException("الدور غير موجود");
      }
      if (!role.permissions.some((row) => row.permission.code === StaffPermission.USERS_MANAGE)) {
        await this.assertNotLastManager(id);
      }
      roleId = role.id;
    }
    if (dto.status === "SUSPENDED") {
      await this.assertNotLastManager(id);
    }
    const displayName = dto.displayName
      ? await assertUniqueDisplayName(this.prisma, AccountType.STAFF, dto.displayName, id)
      : user.displayName;
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        displayName,
        ...(dto.status ? { status: dto.status } : {}),
        staff: {
          update: {
            roleId,
            ...(dto.team !== undefined ? { team: dto.team.trim() || user.staff.team } : {}),
          },
        },
      },
      include: {
        staff: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    return this.toStaff(updated);
  }

  private async assertNotLastManager(userId: string) {
    const managers = await this.prisma.staffUser.findMany({
      where: {
        user: { accountType: AccountType.STAFF, status: AccountStatus.ACTIVE },
        role: { permissions: { some: { permission: { code: StaffPermission.USERS_MANAGE } } } },
      },
      select: { userId: true },
    });
    if (managers.length <= 1 && managers.some((row) => row.userId === userId)) {
      throw new BadRequestException("لا يمكن تعديل آخر حساب يملك إدارة المستخدمين");
    }
  }

  private toStaff(user: {
    id: string;
    displayName: string;
    mobile: string;
    accountCode: string;
    status: string;
    staff?: {
      team: string;
      level: number;
      role: {
        id: string;
        code: string;
        nameAr: string;
        nameEn: string;
        permissions: { permission: { code: string; nameAr: string } }[];
      };
    } | null;
  }) {
    const role = user.staff?.role;
    return {
      id: user.id,
      displayName: user.displayName,
      mobile: user.mobile,
      accountCode: user.accountCode,
      status: user.status,
      team: user.staff?.team ?? "OPS",
      level: user.staff?.level ?? 1,
      role: role
        ? { id: role.id, code: role.code, nameAr: role.nameAr, nameEn: role.nameEn }
        : null,
      permissions: role?.permissions.map((row) => row.permission.code) ?? [],
    };
  }

  regions() {
    return this.prisma.region.findMany({
      include: {
        cities: {
          orderBy: { nameAr: "asc" },
          include: { coverageAreas: { orderBy: { nameAr: "asc" } } },
        },
      },
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

  async packages() {
    const rows = await this.prisma.package.findMany({ orderBy: { rank: "asc" } });
    return rows.map((row) => this.toPackage(row));
  }

  async createPackage(dto: UpsertPackageDto) {
    try {
      const row = await this.prisma.package.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          nameAr: dto.nameAr.trim(),
          nameEn: (dto.nameEn ?? dto.nameAr).trim(),
          durationMonths: dto.durationMonths,
          price: dto.price,
          vatPercent: dto.vatPercent ?? 15,
          rank: dto.rank,
          maxServices: dto.maxServices ?? null,
          maxPhotos: dto.maxPhotos ?? null,
          maxVideos: dto.maxVideos ?? null,
          maxAlbums: dto.maxAlbums ?? null,
          allowWhatsApp: dto.allowWhatsApp ?? true,
          allowRating: dto.allowRating ?? true,
          hasBadge: dto.hasBadge ?? false,
          isActive: dto.isActive ?? true,
        },
      });
      return this.toPackage(row);
    } catch (error) {
      return this.rethrowUnique(error, "رمز الباقة مستخدم");
    }
  }

  async patchPackage(id: string, dto: PatchPackageDto) {
    const current = await this.prisma.package.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException("الباقة غير موجودة");
    }
    const row = await this.prisma.package.update({
      where: { id },
      data: {
        ...(dto.nameAr ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.durationMonths !== undefined ? { durationMonths: dto.durationMonths } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.vatPercent !== undefined ? { vatPercent: dto.vatPercent } : {}),
        ...(dto.rank !== undefined ? { rank: dto.rank } : {}),
        ...(dto.maxServices !== undefined ? { maxServices: dto.maxServices } : {}),
        ...(dto.maxPhotos !== undefined ? { maxPhotos: dto.maxPhotos } : {}),
        ...(dto.maxVideos !== undefined ? { maxVideos: dto.maxVideos } : {}),
        ...(dto.maxAlbums !== undefined ? { maxAlbums: dto.maxAlbums } : {}),
        ...(dto.allowWhatsApp !== undefined ? { allowWhatsApp: dto.allowWhatsApp } : {}),
        ...(dto.allowRating !== undefined ? { allowRating: dto.allowRating } : {}),
        ...(dto.hasBadge !== undefined ? { hasBadge: dto.hasBadge } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.toPackage(row);
  }

  async createCampaign(dto: CreateCampaignDto) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException("تاريخ نهاية الحملة قبل بدايتها");
    }
    return this.prisma.campaign.create({
      data: {
        nameAr: dto.nameAr.trim(),
        nameEn: (dto.nameEn ?? dto.nameAr).trim(),
        startDate: dto.startDate,
        endDate: dto.endDate,
        benefitDays: dto.benefitDays,
        isActive: dto.isActive ?? false,
      },
    });
  }

  private toPackage(pkg: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    durationMonths: number;
    price: { toString(): string } | number;
    vatPercent: { toString(): string } | number;
    rank: number;
    maxServices: number | null;
    maxPhotos: number | null;
    maxVideos: number | null;
    maxAlbums: number | null;
    allowWhatsApp: boolean;
    allowRating: boolean;
    hasBadge: boolean;
    isActive: boolean;
  }) {
    return {
      id: pkg.id,
      code: pkg.code,
      nameAr: pkg.nameAr,
      nameEn: pkg.nameEn,
      durationMonths: pkg.durationMonths,
      price: Number(pkg.price),
      vatPercent: Number(pkg.vatPercent),
      rank: pkg.rank,
      maxServices: pkg.maxServices,
      maxPhotos: pkg.maxPhotos,
      maxVideos: pkg.maxVideos,
      maxAlbums: pkg.maxAlbums,
      allowWhatsApp: pkg.allowWhatsApp,
      allowRating: pkg.allowRating,
      hasBadge: pkg.hasBadge,
      isActive: pkg.isActive,
    };
  }

  async dashboard() {
    const now = new Date();
    const week = new Date(now);
    week.setDate(week.getDate() + 7);
    const [
      pendingMedia,
      pendingReceipts,
      pendingProviders,
      pendingProfileChanges,
      pendingRatings,
      openComplaints,
      openTickets,
      activeProviders,
      customers,
      expiringSubscriptions,
    ] = await Promise.all([
      this.prisma.mediaFile.count({ where: { status: { in: ["PENDING", "NEED_CLEARER"] } } }),
      this.prisma.paymentProof.count({ where: { opsStatus: { in: ["PENDING", "NEED_CLEARER"] } } }),
      this.prisma.user.count({
        where: {
          accountType: AccountType.PROVIDER,
          status: { in: [AccountStatus.INACTIVE, AccountStatus.PENDING_APPROVAL] },
        },
      }),
      this.prisma.profileChangeRequest.count({ where: { status: "PENDING" } }),
      this.prisma.rating.count({ where: { status: "PENDING" } }),
      this.prisma.complaint.count({ where: { status: "OPEN" } }),
      this.prisma.ticket.count({ where: { status: { in: ["SENT", "IN_PROGRESS"] } } }),
      this.prisma.user.count({
        where: { accountType: AccountType.PROVIDER, status: AccountStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: { accountType: AccountType.CUSTOMER, status: { not: AccountStatus.DELETED } },
      }),
      this.prisma.subscription.count({
        where: { status: "ACTIVE", endAt: { gte: now, lte: week } },
      }),
    ]);
    return {
      pendingMedia,
      pendingReceipts,
      pendingProviders,
      pendingProfileChanges,
      pendingRatings,
      openComplaints,
      openTickets,
      activeProviders,
      customers,
      expiringSubscriptions,
    };
  }

  async media(query: { status?: string; kind?: string; purpose?: string; accountType?: string }) {
    const pending = !query.status || query.status === "PENDING";
    const files = await this.prisma.mediaFile.findMany({
      where: {
        ...(pending
          ? { status: { in: ["PENDING", "NEED_CLEARER"] } }
          : query.status
            ? { status: query.status }
            : {}),
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.accountType ? { uploadedBy: { accountType: query.accountType } } : {}),
        ...(query.purpose === "RECEIPT" ? { proofs: { some: {} } } : {}),
        ...(query.purpose === "PORTFOLIO" ? { portfolio: { some: {} } } : {}),
        ...(query.purpose === "AVATAR" ? { storageKey: { startsWith: "avatars/" } } : {}),
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true,
            accountType: true,
            accountCode: true,
            mobile: true,
            status: true,
          },
        },
        portfolio: { select: { id: true, albumId: true, approvalStatus: true } },
        proofs: {
          include: {
            subscription: { include: { package: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return files.map((file) => this.toMediaItem(file));
  }

  async reviewMedia(id: string, dto: ReviewMediaDto, actorId?: string) {
    const file = await this.prisma.mediaFile.findUnique({
      where: { id },
      include: {
        uploadedBy: true,
        portfolio: true,
        proofs: { include: { subscription: { include: { package: true } } } },
      },
    });
    if (!file) {
      throw new NotFoundException("الملف غير موجود");
    }
    if (dto.requestClearer) {
      await this.prisma.mediaFile.update({
        where: { id },
        data: { status: "NEED_CLEARER" },
      });
      if (file.proofs.length) {
        await this.prisma.paymentProof.updateMany({
          where: { fileId: id },
          data: { opsStatus: "NEED_CLEARER" },
        });
      }
      await this.notifyOwner(
        file.uploadedById,
        "طلب صورة أوضح",
        dto.note?.trim() || "يرجى رفع إثبات أوضح للمراجعة",
      );
      return this.mediaById(id);
    }
    if (dto.approve !== true && dto.approve !== false) {
      throw new BadRequestException("حددي الاعتماد أو الرفض");
    }
    const status = dto.approve ? "APPROVED" : "REJECTED";
    await this.prisma.mediaFile.update({ where: { id }, data: { status } });
    if (file.portfolio.length) {
      await this.prisma.portfolioItem.updateMany({
        where: { fileId: id },
        data: { approvalStatus: status },
      });
    }
    const avatarChange = await this.prisma.profileChangeRequest.findFirst({
      where: {
        userId: file.uploadedById,
        field: ProfileChangeField.AVATAR,
        status: "PENDING",
        newValue: id,
      },
    });
    if (avatarChange) {
      await this.reviewChange(avatarChange.id, dto.approve);
    } else if (dto.approve && file.storageKey.startsWith("avatars/")) {
      await this.prisma.user.update({
        where: { id: file.uploadedById },
        data: { avatarFileId: id },
      });
    }
    for (const proof of file.proofs) {
      if (dto.approve) {
        await this.activateProof(proof, dto.startAt, dto.endAt, actorId);
      } else {
        await this.prisma.paymentProof.update({
          where: { id: proof.id },
          data: { opsStatus: "REJECTED", financeStatus: "REJECTED" },
        });
      }
    }
    await this.notifyOwner(
      file.uploadedById,
      dto.approve ? "تم اعتماد الملف" : "تم رفض الملف",
      dto.note?.trim() ||
        (dto.approve ? "اعتمد المشغّل الملف المرفوع" : "رفض المشغّل الملف المرفوع"),
    );
    return this.mediaById(id);
  }

  async pendingProviders() {
    const users = await this.prisma.user.findMany({
      where: {
        accountType: AccountType.PROVIDER,
        status: { in: [AccountStatus.INACTIVE, AccountStatus.PENDING_APPROVAL] },
      },
      include: {
        providerProfile: { include: { city: true } },
        subscriptions: {
          orderBy: { startAt: "desc" },
          take: 1,
          include: { package: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      accountCode: user.accountCode,
      mobile: user.mobile,
      status: user.status,
      city: user.providerProfile?.city ?? null,
      visibility: user.providerProfile?.visibility ?? null,
      package: user.subscriptions[0]?.package
        ? {
            code: user.subscriptions[0].package.code,
            nameAr: user.subscriptions[0].package.nameAr,
          }
        : null,
      createdAt: user.createdAt,
    }));
  }

  async reviewProvider(id: string, dto: ReviewProviderDto, actorId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, accountType: AccountType.PROVIDER },
      include: {
        providerProfile: true,
        subscriptions: {
          where: { status: "ACTIVE", endAt: { gte: new Date() } },
          take: 1,
        },
      },
    });
    if (!user?.providerProfile) {
      throw new NotFoundException("حساب الخبيرة غير موجود");
    }
    if (dto.approve) {
      const live = user.subscriptions.length > 0;
      await this.prisma.user.update({
        where: { id },
        data: {
          status: live ? AccountStatus.ACTIVE : AccountStatus.PENDING_APPROVAL,
          providerProfile: {
            update: { visibility: live ? Visibility.PUBLIC : Visibility.HIDDEN },
          },
          statusHistory: {
            create: {
              fromStatus: user.status,
              toStatus: live ? AccountStatus.ACTIVE : AccountStatus.PENDING_APPROVAL,
              reason: dto.reason?.trim() || "ops-approve",
              actorId,
            },
          },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id },
        data: {
          status: AccountStatus.SUSPENDED,
          providerProfile: { update: { visibility: Visibility.HIDDEN } },
          statusHistory: {
            create: {
              fromStatus: user.status,
              toStatus: AccountStatus.SUSPENDED,
              reason: dto.reason?.trim() || "ops-reject",
              actorId,
            },
          },
        },
      });
    }
    await this.notifyOwner(
      id,
      dto.approve ? "تم اعتماد الحساب" : "تم إيقاف الحساب",
      dto.reason?.trim() ||
        (dto.approve ? "اعتمد المشغّل ملف الخبيرة" : "لم يُعتمد ملف الخبيرة"),
    );
    return { ok: true, approve: dto.approve };
  }

  private async mediaById(id: string) {
    const file = await this.prisma.mediaFile.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true,
            accountType: true,
            accountCode: true,
            mobile: true,
            status: true,
          },
        },
        portfolio: { select: { id: true, albumId: true, approvalStatus: true } },
        proofs: { include: { subscription: { include: { package: true } } } },
      },
    });
    if (!file) {
      throw new NotFoundException("الملف غير موجود");
    }
    return this.toMediaItem(file);
  }

  private toMediaItem(file: {
    id: string;
    storageKey: string;
    mime: string;
    sizeBytes: number;
    kind: string;
    status: string;
    createdAt: Date;
    uploadedBy: {
      id: string;
      displayName: string;
      accountType: string;
      accountCode: string;
      mobile: string;
      status: string;
    };
    portfolio: { id: string; albumId: string | null; approvalStatus: string }[];
    proofs: {
      id: string;
      opsStatus: string;
      financeStatus: string;
      amount: { toString(): string } | number;
      subscription: {
        status: string;
        startAt: Date;
        endAt: Date;
        package: { code: string; nameAr: string; durationMonths: number };
      };
    }[];
  }) {
    const purpose = file.proofs.length
      ? "RECEIPT"
      : file.portfolio.length
        ? "PORTFOLIO"
        : file.storageKey.startsWith("avatars/")
          ? "AVATAR"
          : "FILE";
    const url = fileUrl(file.storageKey);
    return {
      id: file.id,
      purpose,
      kind: file.kind,
      status: file.status,
      mime: file.mime,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt,
      url,
      text: url ? null : file.storageKey,
      owner: file.uploadedBy,
      portfolio: file.portfolio,
      proofs: file.proofs.map((proof) => ({
        id: proof.id,
        opsStatus: proof.opsStatus,
        financeStatus: proof.financeStatus,
        amount: Number(proof.amount),
        subscriptionStatus: proof.subscription.status,
        startAt: proof.subscription.startAt,
        endAt: proof.subscription.endAt,
        package: {
          code: proof.subscription.package.code,
          nameAr: proof.subscription.package.nameAr,
          durationMonths: proof.subscription.package.durationMonths,
        },
      })),
    };
  }

  private async activateProof(
    proof: {
      id: string;
      subscriptionId: string;
      subscription: {
        providerUserId?: string;
        package: { durationMonths: number };
      };
    },
    startAt?: Date,
    endAt?: Date,
    actorId?: string,
  ) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: proof.subscriptionId },
    });
    if (!sub) {
      return;
    }
    const start = startAt ?? new Date();
    const end =
      endAt ??
      (() => {
        const next = new Date(start);
        next.setMonth(next.getMonth() + proof.subscription.package.durationMonths);
        return next;
      })();
    await this.prisma.paymentProof.update({
      where: { id: proof.id },
      data: { opsStatus: "APPROVED", financeStatus: "APPROVED", activatedAt: new Date() },
    });
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", startAt: start, endAt: end },
    });
    await this.prisma.user.update({
      where: { id: sub.providerUserId },
      data: {
        status: AccountStatus.ACTIVE,
        providerProfile: { update: { visibility: Visibility.PUBLIC } },
        statusHistory: {
          create: {
            fromStatus: AccountStatus.INACTIVE,
            toStatus: AccountStatus.ACTIVE,
            reason: "payment-approved",
            actorId,
          },
        },
      },
    });
  }

  private notifyOwner(userId: string, titleAr: string, bodyAr: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        titleAr,
        titleEn: titleAr,
        bodyAr,
        bodyEn: bodyAr,
        status: "SENT",
      },
    });
  }

  private ticketInclude = {
    type: true,
    owner: {
      select: { id: true, displayName: true, accountCode: true, accountType: true, mobile: true },
    },
    comments: {
      include: {
        author: { select: { id: true, displayName: true, accountType: true, accountCode: true } },
      },
      orderBy: { createdAt: "asc" as const },
    },
  };

  private ticketById(id: string) {
    return this.prisma.ticket.findUniqueOrThrow({
      where: { id },
      include: this.ticketInclude,
    });
  }

  private ticketStatusLabel(status: string) {
    if (status === "IN_PROGRESS") {
      return "الطلب قيد المعالجة";
    }
    if (status === "RESOLVED") {
      return "تم حل الطلب";
    }
    if (status === "CLOSED") {
      return "تم إغلاق الطلب";
    }
    return "الطلب بانتظار المراجعة";
  }

  private accountStatusLabel(status: string) {
    const labels: Record<string, string> = {
      ACTIVE: "نشط",
      RESTRICTED: "مقيّد",
      SUSPENDED: "موقوف",
      CANCELLED: "ملغى",
      DELETED: "محذوف",
    };
    return labels[status] ?? status;
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
