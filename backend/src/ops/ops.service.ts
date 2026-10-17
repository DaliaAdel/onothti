import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileChangeField, Visibility, AccountStatus, AccountType, StaffPermission } from "../common/enums";
import { effectivePermissionCodes } from "../common/staff-permissions";
import { notifyStaffWithPermission as notifyStaffByPermission } from "../common/notify";
import { assertUniqueDisplayName, assertUniqueEmail } from "../common/account-rules";
import {
  CreateCityDto,
  PatchCampaignDto,
  PatchCityDto,
  PatchRegionDto,
  UpdateSettingDto,
  UpsertRegionDto,
  UpsertWelcomeDto,
  PatchWelcomeDto,
  ReviewMediaDto,
  ReviewProviderDto,
  UpsertPackageDto,
  PatchPackageDto,
  CreateCampaignDto,
  ReviewRatingDto,
  PatchComplaintDto,
  CreateStaffDto,
  PatchStaffDto,
  PatchMeDto,
  UpsertStaffDepartmentDto,
  PatchStaffDepartmentDto,
  UpsertStaffTeamDto,
  PatchStaffTeamDto,
  PatchRolePermissionsDto,
  PatchStaffPermissionsDto,
  PatchLegalDto,
  CreateLegalDto,
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
  CreateOpsTicketDto,
  CreateTicketCommentDto,
  PatchAccountDto,
  NotifyAccountDto,
  BroadcastDto,
} from "./dto/ops.dto";
import { parseCityIds, replaceProviderCities } from "../common/geo";
import { resolvePackagePricing, serializePackage } from "../common/package-price";
import { fileUrl, publicUploadUrl } from "../common/upload-url";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

@Injectable()
export class OpsService {
  private readonly staffDetailInclude = {
    role: { include: { permissions: { include: { permission: true } } } },
    orgTeam: { include: { department: true } },
    grants: { include: { permission: true } },
  };

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
    return this.prisma.campaign.findMany({
      include: { package: { select: { id: true, code: true, nameAr: true, nameEn: true } } },
      orderBy: { startDate: "desc" },
    });
  }

  async patchCampaign(id: string, dto: PatchCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new NotFoundException("الحملة غير موجودة");
    }
    if (dto.packageId) {
      await this.requirePackage(dto.packageId);
    }
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.startDate ? { startDate: dto.startDate } : {}),
        ...(dto.endDate ? { endDate: dto.endDate } : {}),
        ...(dto.benefitDays ? { benefitDays: dto.benefitDays } : {}),
        ...(dto.packageId ? { packageId: dto.packageId } : {}),
        ...(dto.clipToEndDate !== undefined ? { clipToEndDate: dto.clipToEndDate } : {}),
      },
      include: { package: { select: { id: true, code: true, nameAr: true, nameEn: true } } },
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

  async patchWelcome(id: string, dto: PatchWelcomeDto) {
    const row = await this.prisma.welcomeMessage.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("الرسالة غير موجودة");
    }
    return this.prisma.welcomeMessage.update({
      where: { id },
      data: {
        ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.bodyAr !== undefined ? { bodyAr: dto.bodyAr } : {}),
        ...(dto.bodyEn !== undefined ? { bodyEn: dto.bodyEn } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
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
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async reviewChange(id: string, approve: boolean, reopen = false) {
    const change = await this.prisma.profileChangeRequest.findUnique({
      where: { id },
      include: { user: { include: { providerProfile: true, customerProfile: true } } },
    });
    if (!change) {
      throw new NotFoundException("طلب التعديل غير موجود");
    }
    if (reopen) {
      if (change.status === "APPROVED") {
        throw new BadRequestException("لا يمكن إعادة عنصر معتمد للمراجعة");
      }
      if (change.status === "PENDING") {
        return change;
      }
      await this.notifyOwner(change.userId, "أُعيد التعديل للمراجعة", "سيُراجع المشغّل التعديل مرة أخرى");
      return this.prisma.profileChangeRequest.update({
        where: { id },
        data: { status: "PENDING", reviewedAt: null },
      });
    }
    if (change.status !== "PENDING" && change.status !== "REJECTED") {
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
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async reviewRating(id: string, dto: ReviewRatingDto) {
    const rating = await this.prisma.rating.findUnique({ where: { id } });
    if (!rating) {
      throw new NotFoundException("التقييم غير موجود");
    }
    if (dto.reopen) {
      if (rating.status === "APPROVED") {
        throw new BadRequestException("لا يمكن إعادة عنصر معتمد للمراجعة");
      }
      if (rating.status === "PENDING") {
        return rating;
      }
      const updated = await this.prisma.rating.update({
        where: { id },
        data: { status: "PENDING" },
      });
      await this.notifyOwner(rating.providerUserId, "أُعيد تقييم للمراجعة", dto.note?.trim() || "سيُراجع التقييم مرة أخرى");
      await this.notifyOwner(rating.customerUserId, "أُعيد تقييمك للمراجعة", dto.note?.trim() || "سيُراجع التقييم مرة أخرى");
      return updated;
    }
    if (rating.status !== "PENDING" && rating.status !== "REJECTED") {
      throw new BadRequestException("التقييم تمت مراجعته");
    }
    if (dto.approve !== true && dto.approve !== false) {
      throw new BadRequestException("حددي الاعتماد أو الرفض");
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
        staff: {
          include: {
            ...this.staffDetailInclude,
          },
        },
      },
    });
    if (!user?.staff) {
      throw new NotFoundException("حساب التشغيل غير موجود");
    }
    return this.toStaff(user);
  }

  async patchMe(userId: string, dto: PatchMeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        staff: {
          include: {
            ...this.staffDetailInclude,
          },
        },
      },
    });
    if (!user?.staff) {
      throw new NotFoundException("حساب التشغيل غير موجود");
    }
    if (!dto.displayName?.trim()) {
      return this.toStaff(user);
    }
    const displayName = await assertUniqueDisplayName(
      this.prisma,
      AccountType.STAFF,
      dto.displayName,
      userId,
    );
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { displayName },
      include: {
        staff: {
          include: {
            ...this.staffDetailInclude,
          },
        },
      },
    });
    await this.audit(userId, "PROFILE_UPDATE", "User", userId, { displayName });
    return this.toStaff(updated);
  }

  async events(query: { q?: string; action?: string; from?: string; to?: string; actorId?: string }) {
    const q = query.q?.trim();
    const from = query.from ? new Date(`${query.from}T00:00:00`) : undefined;
    const to = query.to ? new Date(`${query.to}T23:59:59`) : undefined;
    return this.prisma.auditLog.findMany({
      where: {
        ...(query.action ? { action: query.action } : {}),
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
                ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { action: { contains: q } },
                { entity: { contains: q } },
                { entityId: { contains: q } },
                { actor: { displayName: { contains: q } } },
                { actor: { accountCode: { contains: q } } },
              ],
            }
          : {}),
      },
      include: {
        actor: { select: { displayName: true, accountCode: true, accountType: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
  }

  async teamActivity() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const logs = await this.prisma.auditLog.findMany({
      where: { createdAt: { gte: start }, actorId: { not: null } },
      select: { actorId: true, action: true },
    });
    const staff = await this.prisma.user.findMany({
      where: { accountType: AccountType.STAFF, status: { not: AccountStatus.DELETED } },
      select: {
        id: true,
        displayName: true,
        accountCode: true,
        staff: { select: { team: true } },
      },
    });
    const byId = new Map(
      staff.map((row) => [
        row.id,
        {
          actorId: row.id,
          displayName: row.displayName,
          accountCode: row.accountCode,
          team: row.staff?.team || "OPS",
          media: 0,
          tickets: 0,
          accounts: 0,
          other: 0,
          total: 0,
        },
      ]),
    );
    for (const log of logs) {
      if (!log.actorId) {
        continue;
      }
      const row = byId.get(log.actorId);
      if (!row) {
        continue;
      }
      row.total += 1;
      if (log.action.startsWith("MEDIA_") || log.action.startsWith("PROVIDER_")) {
        row.media += 1;
      } else if (log.action.startsWith("TICKET_")) {
        row.tickets += 1;
      } else if (log.action.startsWith("ACCOUNT_") || log.action === "NOTIFY_ACCOUNT") {
        row.accounts += 1;
      } else {
        row.other += 1;
      }
    }
    return {
      date: start.toISOString().slice(0, 10),
      rows: [...byId.values()].filter((row) => row.total > 0).sort((a, b) => b.total - a.total),
    };
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
    return this.prisma.legalPage.findMany({ orderBy: [{ audience: "asc" }, { kind: "asc" }, { titleAr: "asc" }] });
  }

  async createLegal(dto: CreateLegalDto) {
    const page = await this.prisma.legalPage.create({
      data: {
        code: await this.nextLegalCode(dto.kind, dto.audience),
        audience: dto.audience,
        kind: dto.kind,
        titleAr: dto.titleAr.trim(),
        bodyAr: dto.bodyAr.trim(),
        titleEn: dto.titleEn?.trim() ?? "",
        bodyEn: dto.bodyEn?.trim() ?? "",
        isActive: dto.isActive ?? true,
      },
    });
    if (page.kind === "TERMS" && page.isActive) {
      await this.bumpTermsVersion();
    }
    return page;
  }

  async patchLegal(id: string, dto: PatchLegalDto) {
    const page = await this.prisma.legalPage.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException("الصفحة غير موجودة");
    }
    if (
      dto.titleAr === undefined &&
      dto.bodyAr === undefined &&
      dto.titleEn === undefined &&
      dto.bodyEn === undefined &&
      dto.audience === undefined &&
      dto.kind === undefined &&
      dto.isActive === undefined
    ) {
      throw new BadRequestException("لا يوجد تغيير للحفظ");
    }
    const updated = await this.prisma.legalPage.update({
      where: { id },
      data: {
        ...(dto.titleAr !== undefined ? { titleAr: dto.titleAr.trim() } : {}),
        ...(dto.bodyAr !== undefined ? { bodyAr: dto.bodyAr.trim() } : {}),
        ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn.trim() } : {}),
        ...(dto.bodyEn !== undefined ? { bodyEn: dto.bodyEn.trim() } : {}),
        ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        version: page.version + 1,
      },
    });
    if (updated.kind === "TERMS") {
      await this.bumpTermsVersion();
    }
    return updated;
  }

  private async nextLegalCode(kind: string, audience: string) {
    const base = `${kind}_${audience}`;
    const taken = await this.prisma.legalPage.findUnique({ where: { code: base } });
    if (!taken) {
      return base;
    }
    return `${base}_${randomBytes(2).toString("hex")}`;
  }

  private async bumpTermsVersion() {
    const current = await this.prisma.getSettingInt("terms_version", 1);
    await this.prisma.setting.upsert({
      where: { key: "terms_version" },
      update: { value: String(current + 1) },
      create: { key: "terms_version", value: String(current + 1) },
    });
  }

  catalog() {
    return this.prisma.service.findMany({
      include: { subServices: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
  }

  async createService(dto: UpsertServiceDto) {
    const code = await this.uniqueCatalogCode("service", dto.nameEn, dto.code);
    return this.prisma.service
      .create({
        data: {
          code,
          nameAr: dto.nameAr.trim(),
          nameEn: dto.nameEn.trim(),
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
    const code = await this.uniqueCatalogCode("subService", dto.nameEn, dto.code);
    return this.prisma.subService
      .create({
        data: {
          serviceId,
          code,
          nameAr: dto.nameAr.trim(),
          nameEn: dto.nameEn.trim(),
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

  ticketTypes() {
    return this.prisma.ticketType.findMany({
      where: { audience: AccountType.STAFF, code: { in: ["OP-SUPPORT", "OP-SUGGEST"] } },
      orderBy: { code: "asc" },
    });
  }

  async createTicket(actorId: string, dto: CreateOpsTicketDto) {
    const type = await this.prisma.ticketType.findFirst({
      where: { code: dto.typeCode, audience: AccountType.STAFF },
    });
    if (!type) {
      throw new BadRequestException("نوع الطلب غير متاح");
    }
    const title = dto.title.trim();
    const body = dto.body?.trim() || title;
    const count = await this.prisma.ticket.count();
    const created = await this.prisma.ticket.create({
      data: {
        refNo: `OP-${String(count + 1).padStart(6, "0")}-${actorId.slice(0, 4)}`,
        typeId: type.id,
        ownerId: actorId,
        title,
        body,
        queue: "OPS",
        status: "SENT",
      },
    });
    await this.audit(actorId, "TICKET_CREATE", "Ticket", created.id, { typeCode: type.code, title });
    return this.ticketById(created.id);
  }

  tickets(query: { status?: string; priority?: string; queue?: string; mine?: string; actorId?: string }) {
    const priorityNum = query.priority ? Number(query.priority) : NaN;
    return this.prisma.ticket.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(Number.isFinite(priorityNum) ? { priority: priorityNum } : {}),
        ...(query.queue ? { queue: query.queue } : {}),
        ...(query.mine === "1" && query.actorId ? { assigneeId: query.actorId } : {}),
      },
      include: this.ticketInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async patchTicket(id: string, dto: PatchTicketDto, actorId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("الطلب غير موجود");
    }
    if (dto.status == null && dto.priority == null && dto.queue == null && !dto.claim && !dto.note) {
      throw new BadRequestException("حددي الحالة أو التوجيه أو الإسناد");
    }
    const queue = dto.queue;
    const claim = dto.claim === true;
    await this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.priority != null ? { priority: dto.priority } : {}),
        ...(queue ? { queue, assigneeId: null, priority: dto.priority ?? (queue === "OPS" ? ticket.priority : 1) } : {}),
        ...(claim ? { assigneeId: actorId, status: ticket.status === "SENT" ? "IN_PROGRESS" : ticket.status } : {}),
        ...(!queue && !claim && dto.status ? { assigneeId: actorId } : {}),
        ...(!queue && !claim && dto.priority != null ? { assigneeId: actorId } : {}),
      },
    });
    if (dto.note?.trim()) {
      await this.prisma.ticketComment.create({
        data: { ticketId: id, authorId: actorId, body: dto.note.trim() },
      });
    }
    const action = queue
      ? "TICKET_ROUTE"
      : claim
        ? "TICKET_CLAIM"
        : dto.priority === 1
          ? "TICKET_ESCALATE"
          : "TICKET_UPDATE";
    await this.audit(actorId, action, "Ticket", id, {
      status: dto.status,
      priority: dto.priority,
      queue,
      claim,
      note: dto.note,
    });
    if (dto.status) {
      await this.notifyOwner(
        ticket.ownerId,
        dto.status === "CLOSED" || dto.status === "RESOLVED" ? "تم إغلاق طلبك" : "تحديث على طلبك",
        this.ticketStatusLabel(dto.status),
      );
    }
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
    const code = await this.uniqueCatalogCode("coverage", dto.nameEn, dto.code);
    return this.prisma.coverageArea
      .create({
        data: {
          cityId: dto.cityId,
          code,
          nameAr: dto.nameAr.trim(),
          nameEn: dto.nameEn.trim(),
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

  async accounts(query: { q?: string; accountType?: string; status?: string }) {
    const q = query.q?.trim();
    const rows = await this.prisma.user.findMany({
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
        subscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { endAt: "desc" },
          take: 1,
          include: { package: { select: { id: true, code: true, nameAr: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Promise.all(rows.map((user) => this.toManagedAccount(user, false)));
  }

  async accountDetail(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        accountType: { in: [AccountType.CUSTOMER, AccountType.PROVIDER] },
      },
      include: {
        customerProfile: { include: { city: true } },
        providerProfile: {
          include: {
            city: { include: { region: true } },
            cities: { include: { city: true }, orderBy: { sortOrder: "asc" } },
            coverage: { include: { coverageArea: { select: { id: true, nameAr: true } } } },
            services: {
              where: { isActive: true },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              include: {
                service: { select: { nameAr: true } },
                subService: { select: { nameAr: true } },
              },
            },
          },
        },
        subscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { endAt: "desc" },
          take: 1,
          include: { package: { select: { id: true, code: true, nameAr: true } } },
        },
      },
    });
    if (!user) {
      throw new NotFoundException("الحساب غير موجود");
    }
    return this.toManagedAccount(user, true);
  }

  private async toManagedAccount(
    user: {
      id: string;
      displayName: string;
      accountCode: string;
      mobile: string;
      email: string | null;
      accountType: string;
      status: string;
      createdAt: Date;
      avatarFileId?: string | null;
      customerProfile?: { bio?: string | null; city?: { nameAr: string } | null } | null;
      providerProfile?: {
        bio?: string | null;
        whatsapp?: string | null;
        visibility?: string | null;
        badge?: string | null;
        city?: { nameAr: string; region?: { nameAr: string } | null } | null;
        cities?: { city: { nameAr: string } }[];
        coverage?: { coverageArea: { id: string; nameAr: string } }[];
        services?: {
          isActive: boolean;
          isPrimary: boolean;
          service: { nameAr: string };
          subService?: { nameAr: string } | null;
        }[];
      } | null;
      subscriptions?: { endAt: Date; package: { id: string; code: string; nameAr: string } }[];
    },
    detail: boolean,
  ) {
    const pkg = user.subscriptions?.[0];
    const provider = user.providerProfile;
    const customer = user.customerProfile;
    let avatarUrl: string | null = null;
    if (detail && user.avatarFileId) {
      const file = await this.prisma.mediaFile.findUnique({ where: { id: user.avatarFileId } });
      avatarUrl = publicUploadUrl(file?.storageKey);
    }
    return {
      id: user.id,
      displayName: user.displayName,
      accountCode: user.accountCode,
      mobile: user.mobile,
      email: user.email,
      accountType: user.accountType,
      status: user.status,
      createdAt: user.createdAt,
      package: pkg?.package ?? null,
      subscriptionEndAt: pkg?.endAt ?? null,
      avatarUrl,
      bio: provider?.bio ?? customer?.bio ?? null,
      whatsapp: provider?.whatsapp || (user.accountType === AccountType.PROVIDER ? user.mobile : null),
      customerProfile: customer
        ? { city: customer.city ?? null, bio: customer.bio ?? null }
        : null,
      providerProfile: provider
        ? {
            city: provider.city ?? null,
            visibility: provider.visibility ?? null,
            bio: provider.bio ?? null,
            whatsapp: provider.whatsapp || user.mobile,
            badge: provider.badge ?? null,
            region: provider.city?.region ?? null,
            cities: (provider.cities ?? []).map((row) => row.city),
            coverage: (provider.coverage ?? []).map((row) => row.coverageArea),
            services: (provider.services ?? [])
              .filter((row) => row.isActive)
              .map((row) => ({
                nameAr: row.subService?.nameAr || row.service.nameAr,
                isPrimary: row.isPrimary,
              })),
          }
        : null,
    };
  }

  async patchAccount(id: string, dto: PatchAccountDto, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        providerProfile: true,
        subscriptions: {
          where: { status: "ACTIVE" },
          orderBy: { endAt: "desc" },
          take: 1,
          include: { package: true },
        },
      },
    });
    if (!user || user.accountType === AccountType.STAFF) {
      throw new NotFoundException("الحساب غير موجود");
    }
    const reason = dto.reason.trim();
    const nextStatus = dto.status;
    const statusChanged = Boolean(nextStatus && nextStatus !== user.status);
    const currentPackageId = user.subscriptions[0]?.packageId ?? null;
    const nextPackageId = dto.packageId?.trim() || undefined;
    if (nextPackageId && user.accountType !== AccountType.PROVIDER) {
      throw new BadRequestException("الباقة تخص حساب الخبيرة فقط");
    }
    const packageChanged = Boolean(nextPackageId && nextPackageId !== currentPackageId);
    if (!statusChanged && !packageChanged) {
      throw new BadRequestException("لا يوجد تغيير للحفظ. أدخلي سببًا مع تغيير الحالة أو الباقة");
    }

    let assignedPackage: { id: string; code: string; nameAr: string } | null = null;
    if (packageChanged && nextPackageId) {
      assignedPackage = await this.assignProviderPackage(id, nextPackageId);
    }

    if (statusChanged && nextStatus) {
      const hide =
        nextStatus === AccountStatus.RESTRICTED ||
        nextStatus === AccountStatus.SUSPENDED ||
        nextStatus === AccountStatus.CANCELLED ||
        nextStatus === AccountStatus.DELETED;
      const visibility = hide ? Visibility.HIDDEN : dto.visibility;
      await this.prisma.user.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(user.providerProfile && visibility
            ? { providerProfile: { update: { visibility } } }
            : {}),
          statusHistory: {
            create: {
              fromStatus: user.status,
              toStatus: nextStatus,
              reason,
              actorId,
            },
          },
        },
      });
      await this.audit(actorId, "ACCOUNT_STATUS", "User", id, {
        from: user.status,
        status: nextStatus,
        reason,
      });
    }

    if (packageChanged && assignedPackage) {
      await this.audit(actorId, "ACCOUNT_PACKAGE", "User", id, {
        from: user.subscriptions[0]?.package
          ? {
              id: user.subscriptions[0].package.id,
              code: user.subscriptions[0].package.code,
              nameAr: user.subscriptions[0].package.nameAr,
            }
          : null,
        package: assignedPackage,
        reason,
      });
    }

    const summary = [
      statusChanged && nextStatus ? `الحالة: ${this.accountStatusLabel(nextStatus)}` : "",
      assignedPackage ? `الباقة: ${assignedPackage.nameAr}` : "",
      reason,
    ]
      .filter(Boolean)
      .join(" · ");
    await this.notifyOwner(id, "تحديث الحساب", summary);

    return this.accountDetail(id);
  }

  async notifyAccount(id: string, dto: NotifyAccountDto, actorId: string, permissions: string[] = []) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.accountType === AccountType.STAFF || user.status === AccountStatus.DELETED) {
      throw new NotFoundException("الحساب غير موجود");
    }
    const needed =
      user.accountType === AccountType.PROVIDER
        ? StaffPermission.NOTIFY_PROVIDER
        : StaffPermission.NOTIFY_CUSTOMER;
    if (!permissions.includes(needed)) {
      throw new ForbiddenException(
        user.accountType === AccountType.PROVIDER
          ? "ليست لديكِ صلاحية إشعار فردي للخبيرة"
          : "ليست لديكِ صلاحية إشعار فردي للعميلة",
      );
    }
    const titleAr = dto.titleAr.trim();
    const bodyAr = dto.bodyAr.trim();
    await this.prisma.notification.create({
      data: {
        userId: user.id,
        audience: user.accountType,
        type: "SYSTEM",
        titleAr,
        titleEn: titleAr,
        bodyAr,
        bodyEn: bodyAr,
        status: "SENT",
      },
    });
    await this.audit(actorId, "NOTIFY_ACCOUNT", "User", user.id, {
      accountCode: user.accountCode,
      titleAr,
    });
    return { sent: 1, displayName: user.displayName, accountCode: user.accountCode };
  }

  async broadcast(dto: BroadcastDto, permissions: string[] = []) {
    const needed =
      dto.audience === "ALL"
        ? StaffPermission.BROADCAST_ALL
        : dto.audience === AccountType.PROVIDER
          ? StaffPermission.BROADCAST_PROVIDER
          : StaffPermission.BROADCAST_CUSTOMER;
    if (!permissions.includes(needed)) {
      throw new ForbiddenException("ليست لديكِ صلاحية الإرسال لهذا الجمهور");
    }
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
        staff: {
          include: {
            ...this.staffDetailInclude,
          },
        },
      },
      orderBy: { createdAt: "desc" },
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
    const banned = await this.prisma.bannedPhone.findUnique({ where: { mobile: dto.mobile } });
    if (banned) {
      throw new ConflictException("هذا الرقم محظور ولا يمكن إنشاء حساب عليه");
    }
    const displayName = await assertUniqueDisplayName(this.prisma, AccountType.STAFF, dto.displayName);
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 12);
    const orgTeam = await this.resolveOrgTeam(dto.teamId, this.teamForRole(role.code, dto.team));
    const accountCode = await this.prisma.allocateAccountCode(AccountType.STAFF);
    const user = await this.prisma.user
      .create({
      data: {
        accountType: AccountType.STAFF,
        mobile: dto.mobile,
        passwordHash,
        mustChangePassword: true,
        status: AccountStatus.ACTIVE,
        displayName,
        accountCode,
        termsAcceptedAt: new Date(),
        staff: {
          create: {
            roleId: role.id,
            team: orgTeam?.department.code ?? this.teamForRole(role.code, dto.team),
            teamId: orgTeam?.id ?? null,
            titleAr: dto.titleAr?.trim() || null,
            level: role.code === "ADMIN" ? 3 : role.code === "OPS_LEAD" ? 2 : 1,
          },
        },
      },
      include: {
        staff: {
          include: {
            ...this.staffDetailInclude,
          },
        },
      },
    })
      .catch((error: unknown) => this.rethrowUnique(error, "رقم الجوال أو رمز الحساب مستخدم"));
    await this.audit(user.id, "STAFF_CREATE", "User", user.id, {
      role: role.code,
      team: user.staff?.team,
    });
    return this.toStaff(user);
  }

  async patchStaff(id: string, dto: PatchStaffDto, actorId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, accountType: AccountType.STAFF },
      include: {
        staff: {
          include: {
            ...this.staffDetailInclude,
          },
        },
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
      await this.prisma.staffUserPermission.deleteMany({ where: { userId: id } });
    }
    if (dto.status === "SUSPENDED") {
      await this.assertNotLastManager(id);
    }
    const displayName = dto.displayName
      ? await assertUniqueDisplayName(this.prisma, AccountType.STAFF, dto.displayName, id)
      : user.displayName;
    const orgTeam =
      dto.teamId !== undefined
        ? await this.resolveOrgTeam(dto.teamId || undefined, dto.team || user.staff.team)
        : null;
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        displayName,
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.resetPassword ? { mustChangePassword: true } : {}),
        staff: {
          update: {
            roleId,
            ...(dto.roleId && dto.roleId !== user.staff.roleId ? { customPermissions: false } : {}),
            ...(dto.team !== undefined ? { team: dto.team.trim() || user.staff.team } : {}),
            ...(orgTeam ? { teamId: orgTeam.id, team: orgTeam.department.code } : {}),
            ...(dto.titleAr !== undefined ? { titleAr: dto.titleAr.trim() || null } : {}),
          },
        },
      },
      include: {
        staff: {
          include: {
            ...this.staffDetailInclude,
          },
        },
      },
    });
    await this.audit(actorId, dto.resetPassword ? "STAFF_PASSWORD_RESET" : "STAFF_UPDATE", "User", id, {
      status: dto.status,
      roleId,
      team: dto.team,
      resetPassword: dto.resetPassword === true,
    });
    return this.toStaff(updated);
  }

  async patchStaffPermissions(id: string, dto: PatchStaffPermissionsDto, actorId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, accountType: AccountType.STAFF },
      include: { staff: { include: this.staffDetailInclude } },
    });
    if (!user?.staff) {
      throw new NotFoundException("حساب التشغيل غير موجود");
    }
    if (dto.resetToRole) {
      const current = effectivePermissionCodes(user.staff);
      if (current.codes.includes(StaffPermission.USERS_MANAGE)) {
        const roleHasUsers = user.staff.role.permissions.some(
          (row) => row.permission.code === StaffPermission.USERS_MANAGE,
        );
        if (!roleHasUsers) {
          await this.assertNotLastManager(id);
        }
      }
      await this.prisma.staffUserPermission.deleteMany({ where: { userId: id } });
      await this.prisma.staffUser.update({ where: { userId: id }, data: { customPermissions: false } });
      await this.audit(actorId, "STAFF_PERMISSIONS_RESET", "User", id, {});
      return this.staffById(id);
    }
    const uniqueCodes = [...new Set((dto.permissionCodes ?? []).map((code) => code.trim()).filter(Boolean))];
    const catalog = await this.prisma.permission.findMany({
      where: { code: { in: uniqueCodes } },
    });
    if (catalog.length !== uniqueCodes.length) {
      throw new BadRequestException("صلاحية غير معروفة");
    }
    const current = effectivePermissionCodes(user.staff);
    if (current.codes.includes(StaffPermission.USERS_MANAGE) && !uniqueCodes.includes(StaffPermission.USERS_MANAGE)) {
      await this.assertNotLastManager(id);
    }
    await this.prisma.staffUserPermission.deleteMany({ where: { userId: id } });
    if (catalog.length) {
      await this.prisma.staffUserPermission.createMany({
        data: catalog.map((permission) => ({ userId: id, permissionId: permission.id })),
      });
    }
    await this.prisma.staffUser.update({ where: { userId: id }, data: { customPermissions: true } });
    await this.audit(actorId, "STAFF_PERMISSIONS", "User", id, { permissionCodes: uniqueCodes });
    return this.staffById(id);
  }

  private async staffById(id: string) {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id, accountType: AccountType.STAFF },
      include: { staff: { include: this.staffDetailInclude } },
    });
    return this.toStaff(user);
  }

  async orgDepartments() {
    const rows = await this.prisma.staffDepartment.findMany({
      include: {
        teams: {
          orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
          include: {
            lead: { select: { id: true, displayName: true, accountCode: true } },
            members: {
              include: {
                user: {
                  select: { id: true, displayName: true, accountCode: true, status: true, mobile: true },
                },
                role: { select: { id: true, code: true, nameAr: true } },
              },
              orderBy: { level: "desc" },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
    });
    return rows.map((department) => this.serializeDepartment(department));
  }

  async createDepartment(dto: UpsertStaffDepartmentDto) {
    const code = await this.uniqueCatalogCode("department", dto.nameEn, dto.code);
    return this.prisma.staffDepartment
      .create({
        data: {
          code,
          nameAr: dto.nameAr.trim(),
          nameEn: dto.nameEn.trim(),
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        include: { teams: true },
      })
      .then((row) => this.serializeDepartment({ ...row, teams: row.teams.map((team) => ({ ...team, members: [], lead: null })) }))
      .catch((error: unknown) => this.rethrowUnique(error, "رمز القسم مستخدم"));
  }

  async patchDepartment(id: string, dto: PatchStaffDepartmentDto) {
    const row = await this.prisma.staffDepartment.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("القسم غير موجود");
    }
    const updated = await this.prisma.staffDepartment.update({
      where: { id },
      data: {
        ...(dto.nameAr ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    const tree = await this.orgDepartments();
    return tree.find((item) => item.id === updated.id) ?? updated;
  }

  async createTeam(dto: UpsertStaffTeamDto) {
    const department = await this.prisma.staffDepartment.findUnique({ where: { id: dto.departmentId } });
    if (!department) {
      throw new NotFoundException("القسم غير موجود");
    }
    if (dto.leadUserId) {
      await this.assertStaffUser(dto.leadUserId);
    }
    const code = await this.uniqueCatalogCode("team", dto.nameEn, dto.code);
    let row;
    try {
      row = await this.prisma.staffTeam.create({
        data: {
          departmentId: department.id,
          code,
          nameAr: dto.nameAr.trim(),
          nameEn: dto.nameEn.trim(),
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
          leadUserId: dto.leadUserId || null,
        },
      });
    } catch (error: unknown) {
      this.rethrowUnique(error, "رمز الفريق مستخدم");
    }
    if (dto.leadUserId) {
      await this.prisma.staffUser.update({
        where: { userId: dto.leadUserId },
        data: { teamId: row.id, team: department.code },
      });
    }
    const tree = await this.orgDepartments();
    const parent = tree.find((item) => item.id === department.id);
    return parent?.teams.find((team) => team.id === row.id) ?? row;
  }

  async patchTeam(id: string, dto: PatchStaffTeamDto) {
    const team = await this.prisma.staffTeam.findUnique({ where: { id }, include: { department: true } });
    if (!team) {
      throw new NotFoundException("الفريق غير موجود");
    }
    if (dto.departmentId && dto.departmentId !== team.departmentId) {
      const department = await this.prisma.staffDepartment.findUnique({ where: { id: dto.departmentId } });
      if (!department) {
        throw new NotFoundException("القسم غير موجود");
      }
    }
    if (dto.leadUserId) {
      await this.assertStaffUser(dto.leadUserId);
    }
    const updated = await this.prisma.staffTeam.update({
      where: { id },
      data: {
        ...(dto.departmentId ? { departmentId: dto.departmentId } : {}),
        ...(dto.nameAr ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.leadUserId !== undefined ? { leadUserId: dto.leadUserId || null } : {}),
      },
      include: { department: true },
    });
    if (dto.leadUserId) {
      await this.prisma.staffUser.update({
        where: { userId: dto.leadUserId },
        data: { teamId: updated.id, team: updated.department.code },
      });
    }
    const tree = await this.orgDepartments();
    const parent = tree.find((item) => item.id === updated.departmentId);
    return parent?.teams.find((item) => item.id === updated.id) ?? updated;
  }

  private async assertStaffUser(userId: string) {
    const staff = await this.prisma.staffUser.findUnique({ where: { userId } });
    if (!staff) {
      throw new NotFoundException("حساب التشغيل غير موجود");
    }
  }

  private async resolveOrgTeam(teamId?: string, departmentCode?: string) {
    if (teamId) {
      const row = await this.prisma.staffTeam.findUnique({
        where: { id: teamId },
        include: { department: true },
      });
      if (!row) {
        throw new NotFoundException("الفريق غير موجود");
      }
      return row;
    }
    const code = (departmentCode || "OPS").trim() || "OPS";
    const department = await this.prisma.staffDepartment.findUnique({ where: { code } });
    if (!department) {
      return null;
    }
    return this.prisma.staffTeam.findFirst({
      where: { departmentId: department.id, isActive: true },
      include: { department: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  private serializeDepartment(department: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    sortOrder: number;
    isActive: boolean;
    teams: {
      id: string;
      code: string;
      nameAr: string;
      nameEn: string;
      sortOrder: number;
      isActive: boolean;
      leadUserId?: string | null;
      lead?: { id: string; displayName: string; accountCode?: string } | null;
      members?: {
        userId: string;
        titleAr?: string | null;
        level: number;
        user: { id: string; displayName: string; accountCode: string; status: string; mobile: string };
        role: { id: string; code: string; nameAr: string };
      }[];
    }[];
  }) {
    return {
      id: department.id,
      code: department.code,
      nameAr: department.nameAr,
      nameEn: department.nameEn,
      sortOrder: department.sortOrder,
      isActive: department.isActive,
      teams: department.teams.map((team) => {
        const members = (team.members ?? []).map((member) => ({
          id: member.user.id,
          displayName: member.user.displayName,
          accountCode: member.user.accountCode,
          status: member.user.status,
          mobile: member.user.mobile,
          titleAr: member.titleAr || member.role.nameAr,
          role: member.role,
          isLead: team.leadUserId === member.user.id,
        }));
        members.sort((a, b) => Number(b.isLead) - Number(a.isLead));
        return {
          id: team.id,
          code: team.code,
          nameAr: team.nameAr,
          nameEn: team.nameEn,
          sortOrder: team.sortOrder,
          isActive: team.isActive,
          leadUserId: team.leadUserId ?? null,
          lead: team.lead ?? members.find((row) => row.isLead) ?? null,
          memberCount: members.length,
          members,
        };
      }),
    };
  }

  private async assertNotLastManager(userId: string) {
    const rows = await this.prisma.staffUser.findMany({
      where: { user: { accountType: AccountType.STAFF, status: AccountStatus.ACTIVE } },
      include: {
        grants: { include: { permission: true } },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    const managers = rows.filter((row) =>
      effectivePermissionCodes(row).codes.includes(StaffPermission.USERS_MANAGE),
    );
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
    mustChangePassword?: boolean;
    email?: string | null;
    lastActiveAt?: Date | null;
    createdAt?: Date;
    staff?: {
      team: string;
      teamId?: string | null;
      titleAr?: string | null;
      level: number;
      orgTeam?: {
        id: string;
        nameAr: string;
        nameEn: string;
        department: { id: string; code: string; nameAr: string; nameEn: string };
      } | null;
      role: {
        id: string;
        code: string;
        nameAr: string;
        nameEn: string;
        permissions: { permission: { code: string; nameAr: string } }[];
      };
      customPermissions?: boolean;
      grants?: { permission: { code: string } }[] | null;
    } | null;
  }) {
    const role = user.staff?.role;
    const orgTeam = user.staff?.orgTeam;
    const effective = user.staff ? effectivePermissionCodes(user.staff) : { codes: [] as string[], custom: false };
    return {
      id: user.id,
      displayName: user.displayName,
      mobile: user.mobile,
      accountCode: user.accountCode,
      status: user.status,
      mustChangePassword: user.mustChangePassword === true,
      email: user.email,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      team: user.staff?.team ?? "OPS",
      teamId: user.staff?.teamId ?? orgTeam?.id ?? null,
      titleAr: user.staff?.titleAr ?? null,
      orgTeam: orgTeam
        ? {
            id: orgTeam.id,
            nameAr: orgTeam.nameAr,
            nameEn: orgTeam.nameEn,
            department: orgTeam.department,
          }
        : null,
      level: user.staff?.level ?? 1,
      role: role
        ? { id: role.id, code: role.code, nameAr: role.nameAr, nameEn: role.nameEn }
        : null,
      permissions: effective.codes,
      customPermissions: effective.custom,
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
    const code = await this.uniqueCatalogCode("region", dto.nameEn, dto.code);
    return this.prisma.region
      .create({
        data: {
          code,
          nameAr: dto.nameAr.trim(),
          nameEn: dto.nameEn.trim(),
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
      include: {
        cities: {
          orderBy: { nameAr: "asc" },
          include: { coverageAreas: { orderBy: { nameAr: "asc" } } },
        },
      },
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
    const code = await this.uniqueCatalogCode("city", dto.nameEn, dto.code);
    return this.prisma.city
      .create({
        data: {
          regionId: dto.regionId,
          code,
          nameAr: dto.nameAr.trim(),
          nameEn: dto.nameEn.trim(),
          isVisible: dto.isVisible ?? true,
        },
        include: { region: true, coverageAreas: true },
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
      include: { region: true, coverageAreas: { orderBy: { nameAr: "asc" } } },
    });
  }

  async packages() {
    const rows = await this.prisma.package.findMany({ orderBy: { rank: "asc" } });
    return rows.map((row) => serializePackage(row));
  }

  async createPackage(dto: UpsertPackageDto) {
    const pricing = resolvePackagePricing({
      price: dto.price,
      priceBefore: dto.priceBefore,
      discountPercent: dto.discountPercent,
    });
    try {
      const row = await this.prisma.package.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          nameAr: dto.nameAr.trim(),
          nameEn: (dto.nameEn ?? dto.nameAr).trim(),
          durationMonths: dto.durationMonths,
          priceBefore: pricing.priceBefore,
          discountPercent: pricing.discountPercent,
          price: pricing.price,
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
      return serializePackage(row);
    } catch (error) {
      return this.rethrowUnique(error, "رمز الباقة مستخدم");
    }
  }

  async patchPackage(id: string, dto: PatchPackageDto) {
    const current = await this.prisma.package.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException("الباقة غير موجودة");
    }
    const pricingChanged =
      dto.price !== undefined || dto.priceBefore !== undefined || dto.discountPercent !== undefined;
    const pricing = pricingChanged
      ? resolvePackagePricing({
          price: dto.price,
          priceBefore: dto.priceBefore,
          discountPercent: dto.discountPercent,
          current,
        })
      : null;
    const row = await this.prisma.package.update({
      where: { id },
      data: {
        ...(dto.nameAr ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.durationMonths !== undefined ? { durationMonths: dto.durationMonths } : {}),
        ...(pricing
          ? {
              priceBefore: pricing.priceBefore,
              discountPercent: pricing.discountPercent,
              price: pricing.price,
            }
          : {}),
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
    return serializePackage(row);
  }

  async createCampaign(dto: CreateCampaignDto) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException("تاريخ نهاية الحملة قبل بدايتها");
    }
    await this.requirePackage(dto.packageId);
    return this.prisma.campaign.create({
      data: {
        packageId: dto.packageId,
        nameAr: dto.nameAr.trim(),
        nameEn: (dto.nameEn ?? dto.nameAr).trim(),
        startDate: dto.startDate,
        endDate: dto.endDate,
        benefitDays: dto.benefitDays,
        clipToEndDate: dto.clipToEndDate ?? false,
        isActive: dto.isActive ?? false,
      },
      include: { package: { select: { id: true, code: true, nameAr: true, nameEn: true } } },
    });
  }

  private async requirePackage(id: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) {
      throw new NotFoundException("الباقة غير موجودة");
    }
    return pkg;
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
      mediaRows,
      providerRows,
      changeRows,
      ratingRows,
      complaintRows,
      ticketRows,
      staffCount,
      activeAccounts,
      eventsToday,
      escalatedTickets,
    ] = await Promise.all([
      this.prisma.mediaFile.count({
        where: {
          status: { in: ["PENDING", "NEED_CLEARER"] },
          NOT: { storageKey: { startsWith: "avatars/" } },
        },
      }),
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
      this.prisma.mediaFile.findMany({
        where: { status: { in: ["PENDING", "NEED_CLEARER"] } },
        select: {
          id: true,
          createdAt: true,
          storageKey: true,
          proofs: { select: { id: true } },
          uploadedBy: { select: { displayName: true, accountCode: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      this.prisma.user.findMany({
        where: {
          accountType: AccountType.PROVIDER,
          status: { in: [AccountStatus.INACTIVE, AccountStatus.PENDING_APPROVAL] },
        },
        select: { id: true, displayName: true, accountCode: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      this.prisma.profileChangeRequest.findMany({
        where: { status: "PENDING" },
        select: {
          id: true,
          field: true,
          createdAt: true,
          user: { select: { displayName: true, accountCode: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      this.prisma.rating.findMany({
        where: { status: "PENDING" },
        select: {
          id: true,
          stars: true,
          createdAt: true,
          customer: { select: { displayName: true } },
          provider: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      this.prisma.complaint.findMany({
        where: { status: "OPEN" },
        select: {
          id: true,
          reason: true,
          createdAt: true,
          reporter: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      this.prisma.ticket.findMany({
        where: { status: { in: ["SENT", "IN_PROGRESS"] } },
        select: {
          id: true,
          refNo: true,
          createdAt: true,
          type: { select: { nameAr: true } },
          owner: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      this.prisma.user.count({
        where: { accountType: AccountType.STAFF, status: { not: AccountStatus.DELETED } },
      }),
      this.prisma.user.count({
        where: {
          accountType: { in: [AccountType.CUSTOMER, AccountType.PROVIDER] },
          status: AccountStatus.ACTIVE,
        },
      }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
      }),
      this.prisma.ticket.count({
        where: { priority: 1, status: { in: ["SENT", "IN_PROGRESS"] } },
      }),
    ]);
    const inbox = [
      ...mediaRows.map((row) => ({
        id: row.id,
        kind: row.proofs.length ? "RECEIPT" : row.storageKey.startsWith("avatars/") ? "AVATAR" : "MEDIA",
        title: row.uploadedBy.displayName,
        subtitle: row.uploadedBy.accountCode,
        createdAt: row.createdAt,
      })),
      ...providerRows.map((row) => ({
        id: row.id,
        kind: "PROVIDER",
        title: row.displayName,
        subtitle: row.accountCode,
        createdAt: row.createdAt,
      })),
      ...changeRows.map((row) => ({
        id: row.id,
        kind: "CHANGE",
        field: row.field,
        title: row.user.displayName,
        subtitle: row.user.accountCode,
        createdAt: row.createdAt,
      })),
      ...ratingRows.map((row) => ({
        id: row.id,
        kind: "RATING",
        title: `${row.customer.displayName} → ${row.provider.displayName}`,
        subtitle: `${row.stars} نجوم`,
        createdAt: row.createdAt,
      })),
      ...complaintRows.map((row) => ({
        id: row.id,
        kind: "COMPLAINT",
        title: row.reporter.displayName,
        subtitle: row.reason.slice(0, 80),
        createdAt: row.createdAt,
      })),
      ...ticketRows.map((row) => ({
        id: row.id,
        kind: "TICKET",
        title: row.refNo,
        subtitle: `${row.owner.displayName} · ${row.type.nameAr}`,
        createdAt: row.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 12);
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
      staffCount,
      activeAccounts,
      eventsToday,
      escalatedTickets,
      inbox,
    };
  }

  async media(
    query: { status?: string; kind?: string; purpose?: string; accountType?: string },
    permissions: string[] = [],
  ) {
    const canApprovals = this.canApproveContent(permissions);
    const canReceipts = this.canSeeReceipts(permissions);
    if (query.purpose === "RECEIPT" && !canReceipts) {
      return [];
    }
    if (query.purpose && query.purpose !== "RECEIPT" && !canApprovals) {
      return [];
    }
    if (!canApprovals && !canReceipts) {
      return [];
    }
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
        ...(query.purpose === "RECEIPT" || (!query.purpose && !canApprovals) ? { proofs: { some: {} } } : {}),
        ...(!query.purpose && canApprovals && !canReceipts ? { proofs: { none: {} } } : {}),
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
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return files.map((file) => this.toMediaItem(file));
  }

  async reviewMedia(id: string, dto: ReviewMediaDto, actorId?: string, permissions: string[] = []) {
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
    const isReceipt = file.proofs.length > 0;
    if (isReceipt) {
      if (dto.requestClearer) {
        if (!this.canSeeReceipts(permissions)) {
          throw new ForbiddenException("ليست لديكِ صلاحية مراجعة الإيصالات");
        }
      } else if (!permissions.includes(StaffPermission.PAYMENTS_CONFIRM)) {
        throw new ForbiddenException("اعتماد الإيصال للمالية فقط. حوّليه للمالية أولاً");
      }
    } else if (!this.canApproveContent(permissions)) {
      throw new ForbiddenException("ليست لديكِ صلاحية الاعتمادات");
    }
    if (dto.reopen) {
      if (file.status === "APPROVED") {
        throw new BadRequestException("لا يمكن إعادة عنصر معتمد للمراجعة");
      }
      await this.prisma.mediaFile.update({
        where: { id },
        data: { status: "PENDING" },
      });
      if (file.portfolio.length) {
        await this.prisma.portfolioItem.updateMany({
          where: { fileId: id },
          data: { approvalStatus: "PENDING" },
        });
      }
      if (file.proofs.length) {
        await this.prisma.paymentProof.updateMany({
          where: { fileId: id, opsStatus: { not: "APPROVED" } },
          data: { opsStatus: "PENDING" },
        });
      }
      if (file.status !== "PENDING") {
        await this.notifyOwner(
          file.uploadedById,
          "أُعيد الملف للمراجعة",
          dto.note?.trim() || "سيُراجع المشغّل الملف مرة أخرى",
        );
      }
      return this.mediaById(id);
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
    await this.audit(actorId, dto.approve ? "MEDIA_APPROVE" : "MEDIA_REJECT", "MediaFile", id, {
      status,
    });
    return this.mediaById(id);
  }

  async escalateReceipt(id: string, actorId: string) {
    const file = await this.prisma.mediaFile.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { displayName: true, accountCode: true } },
        proofs: { include: { subscription: { include: { package: true } } } },
      },
    });
    if (!file) {
      throw new NotFoundException("الملف غير موجود");
    }
    if (!file.proofs.length) {
      throw new BadRequestException("هذا الملف ليس إيصال تحويل");
    }
    if (file.proofs.every((proof) => proof.opsStatus === "ESCALATED" || proof.opsStatus === "APPROVED")) {
      throw new BadRequestException("تم تحويل الإيصال للمالية مسبقاً");
    }
    await this.prisma.paymentProof.updateMany({
      where: { fileId: id },
      data: { opsStatus: "ESCALATED" },
    });
    const proof = file.proofs[0];
    const amount = Number(proof.amount);
    const body = `تم تحويل إيصال ${file.uploadedBy.displayName} (${file.uploadedBy.accountCode}) — ${proof.subscription.package.nameAr} بقيمة ${amount} ر.س`;
    await this.notifyStaffWithPermission(
      [StaffPermission.PAYMENTS_REVIEW, StaffPermission.PAYMENTS_CONFIRM],
      "إيصال يحتاج اعتماد المالية",
      body,
      `receipt:${id}`,
      actorId,
    );
    await this.audit(actorId, "RECEIPT_ESCALATE", "MediaFile", id, {
      owner: file.uploadedBy.accountCode,
      amount,
    });
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
      orderBy: { createdAt: "desc" },
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
    if (dto.reopen) {
      if (user.status === AccountStatus.ACTIVE) {
        throw new BadRequestException("لا يمكن إعادة حساب معتمد للمراجعة");
      }
      if (user.status === AccountStatus.PENDING_APPROVAL || user.status === AccountStatus.INACTIVE) {
        return { ok: true, approve: false, reopen: true };
      }
      await this.prisma.user.update({
        where: { id },
        data: {
          status: AccountStatus.PENDING_APPROVAL,
          providerProfile: { update: { visibility: Visibility.HIDDEN } },
          statusHistory: {
            create: {
              fromStatus: user.status,
              toStatus: AccountStatus.PENDING_APPROVAL,
              reason: dto.reason?.trim() || "ops-reopen",
              actorId,
            },
          },
        },
      });
      await this.notifyOwner(id, "أُعيد الحساب للمراجعة", dto.reason?.trim() || "سيُراجع المشغّل الحساب مرة أخرى");
      await this.audit(actorId ?? null, "PROVIDER_REOPEN", "User", id);
      return { ok: true, approve: false, reopen: true };
    }
    if (dto.approve !== true && dto.approve !== false) {
      throw new BadRequestException("حددي الاعتماد أو الرفض");
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
    await this.audit(actorId ?? null, dto.approve ? "PROVIDER_APPROVE" : "PROVIDER_REJECT", "User", id);
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

  private teamForRole(code: string, override?: string) {
    if (override?.trim()) {
      return override.trim();
    }
    if (code === "FINANCE") {
      return "FINANCE";
    }
    if (code === "ADMIN") {
      return "ADMIN";
    }
    return "OPS";
  }

  private audit(
    actorId: string | null | undefined,
    action: string,
    entity: string,
    entityId?: string | null,
    payload?: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        payload: payload == null ? null : JSON.stringify(payload),
      },
    });
  }

  private async assignProviderPackage(providerUserId: string, packageId: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      select: { id: true, code: true, nameAr: true, durationMonths: true },
    });
    if (!pkg) {
      throw new BadRequestException("الباقة غير موجودة");
    }
    await this.prisma.subscription.updateMany({
      where: { providerUserId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setMonth(endAt.getMonth() + pkg.durationMonths);
    await this.prisma.subscription.create({
      data: {
        providerUserId,
        packageId: pkg.id,
        startAt,
        endAt,
        status: "ACTIVE",
      },
    });
    return { id: pkg.id, code: pkg.code, nameAr: pkg.nameAr };
  }

  private canApproveContent(permissions: string[]) {
    return (
      permissions.includes(StaffPermission.RATINGS_REVIEW) ||
      permissions.includes(StaffPermission.MEDIA_REVIEW)
    );
  }

  private canSeeReceipts(permissions: string[]) {
    return (
      permissions.includes(StaffPermission.PAYMENTS_REVIEW) ||
      permissions.includes(StaffPermission.PAYMENTS_CONFIRM) ||
      permissions.includes(StaffPermission.ESCALATE_FINANCE)
    );
  }

  private notifyStaffWithPermission(
    codes: string[],
    titleAr: string,
    bodyAr: string,
    ref: string,
    exceptUserId?: string,
  ) {
    return notifyStaffByPermission(this.prisma, codes, titleAr, bodyAr, ref, exceptUserId);
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
    assignee: {
      select: { id: true, displayName: true, accountCode: true },
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

  private catalogCode(nameEn: string, fallback: string) {
    const slug = nameEn
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20);
    return slug.length >= 2 ? slug : fallback;
  }

  private async uniqueCatalogCode(
    kind: "service" | "subService" | "region" | "city" | "coverage" | "department" | "team",
    nameEn: string,
    provided?: string,
  ) {
    const max = kind === "coverage" || kind === "team" ? 40 : kind === "subService" ? 30 : 20;
    const fallback = {
      service: "SVC",
      subService: "SUB",
      region: "REG",
      city: "CTY",
      coverage: "COV",
      department: "DEP",
      team: "TEAM",
    }[kind];
    const base = (provided?.trim() || this.catalogCode(nameEn, fallback)).toUpperCase().slice(0, max);
    const taken =
      kind === "service"
        ? await this.prisma.service.findUnique({ where: { code: base } })
        : kind === "subService"
          ? await this.prisma.subService.findUnique({ where: { code: base } })
          : kind === "region"
            ? await this.prisma.region.findUnique({ where: { code: base } })
            : kind === "city"
              ? await this.prisma.city.findUnique({ where: { code: base } })
              : kind === "coverage"
                ? await this.prisma.coverageArea.findUnique({ where: { code: base } })
                : kind === "department"
                  ? await this.prisma.staffDepartment.findUnique({ where: { code: base } })
                  : await this.prisma.staffTeam.findUnique({ where: { code: base } });
    if (!taken) {
      return base;
    }
    const suffix = `_${randomBytes(2).toString("hex").toUpperCase()}`;
    return `${base.slice(0, max - suffix.length)}${suffix}`;
  }

  private rethrowUnique(error: unknown, message: string): never {
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
      customerProfile: { userId: string } | null;
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
    if (change.field === ProfileChangeField.BIO) {
      if (change.user.providerProfile) {
        await this.prisma.providerProfile.update({
          where: { userId: change.userId },
          data: { bio: change.newValue },
        });
      } else if (change.user.customerProfile) {
        await this.prisma.customerProfile.update({
          where: { userId: change.userId },
          data: { bio: change.newValue },
        });
      }
      return;
    }
    if (!change.user.providerProfile) {
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
