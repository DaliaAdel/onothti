import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SmsProvider } from "./sms/sms.provider";
import {
  LoginDto,
  RegisterDto,
  SendOtpDto,
  VerifyOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  PhoneStartDto,
  PhoneVerifyDto,
  PhoneCompleteDto,
} from "./dto/auth.dto";
import {
  AccountStatus,
  AccountType,
  AuthChannel,
  OtpPurpose,
  ProfileChangeField,
  type AuthChannelValue,
  type OtpPurposeValue,
} from "../common/enums";
import {
  assertUniqueDisplayName,
  assertUniqueEmail,
  pendingChangesFor,
  pendingValue,
} from "../common/account-rules";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sms: SmsProvider,
  ) {}

  async register(dto: RegisterDto) {
    await this.assertNotBanned(dto.mobile);
    const existing = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile },
    });
    if (existing) {
      throw new ConflictException("رقم الجوال مسجل بالفعل");
    }
    const displayName = await assertUniqueDisplayName(this.prisma, dto.accountType, dto.displayName);
    const email = await assertUniqueEmail(this.prisma, dto.email);
    const termsVersion = await this.prisma.getSettingInt("terms_version", 1);

    const count = await this.prisma.user.count({
      where: { accountType: dto.accountType },
    });
    const passwordHash = await bcrypt.hash(dto.password ?? randomBytes(24).toString("hex"), 12);
    const status =
      dto.accountType === AccountType.CUSTOMER
        ? AccountStatus.ACTIVE
        : AccountStatus.INACTIVE;

    const user = await this.prisma.user
      .create({
        data: {
          accountType: dto.accountType,
          mobile: dto.mobile,
          email,
          passwordHash,
          status,
          displayName,
          accountCode: this.prisma.nextAccountCode(dto.accountType, count),
          termsAcceptedAt: new Date(),
          termsVersion,
          customerProfile:
            dto.accountType === AccountType.CUSTOMER ? { create: {} } : undefined,
          providerProfile:
            dto.accountType === AccountType.PROVIDER
              ? { create: { visibility: "HIDDEN", whatsapp: dto.mobile } }
              : undefined,
          statusHistory: {
            create: {
              fromStatus: AccountStatus.INACTIVE,
              toStatus: status,
              reason: "register",
            },
          },
        },
      })
      .catch((error: unknown) => this.rethrowUnique(error));

    const otp = await this.issueOtp(dto.mobile, OtpPurpose.REGISTER);
    return {
      userId: user.id,
      accountCode: user.accountCode,
      status: user.status,
      otpExpiresIn: otp.ttlSeconds,
    };
  }

  async login(dto: LoginDto) {
    const users = await this.prisma.user.findMany({
      where: { mobile: dto.mobile },
      include: { providerProfile: true },
    });
    const matches = [];
    for (const candidate of users) {
      if (await bcrypt.compare(dto.password, candidate.passwordHash)) {
        matches.push(candidate);
      }
    }
    if (matches.length !== 1) {
      throw new UnauthorizedException("بيانات الدخول غير صحيحة");
    }
    const user = matches[0];
    this.assertLoginAllowed(user.status);

    if (!user.mobileVerifiedAt) {
      throw new ForbiddenException("أكدِ رمز التحقق أولًا");
    }

    return this.issueSession(user, {
      deviceId: dto.deviceId,
      channel: dto.channel ?? AuthChannel.WEB,
    });
  }

  async startPhone(dto: PhoneStartDto) {
    await this.assertNotBanned(dto.mobile);
    const user = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile },
      include: { providerProfile: true },
    });
    if (user) {
      this.assertLoginAllowed(user.status);
    }
    const channel = (dto.channel ?? AuthChannel.WEB) as AuthChannelValue;
    if (user && channel === AuthChannel.APP && dto.deviceId) {
      const trusted = await this.findTrustedDevice(user.id, dto.deviceId, channel);
      if (trusted) {
        const session = await this.issueSession(user, { deviceId: dto.deviceId, channel });
        return { ...session, otpRequired: false, isNew: false };
      }
    }
    const otp = await this.issueOtp(dto.mobile, OtpPurpose.LOGIN);
    return { otpExpiresIn: otp.ttlSeconds, isNew: !user, otpRequired: true };
  }

  async verifyPhone(dto: PhoneVerifyDto) {
    await this.verifyOtp({
      mobile: dto.mobile,
      purpose: OtpPurpose.LOGIN,
      code: dto.code,
    });
    const user = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile },
      include: { providerProfile: true },
    });
    if (!user) {
      return { verified: true, needsProfile: true, otpRequired: false };
    }
    this.assertLoginAllowed(user.status);
    return this.issueSession(user, {
      deviceId: dto.deviceId,
      channel: dto.channel ?? AuthChannel.WEB,
    });
  }

  async completePhone(dto: PhoneCompleteDto) {
    await this.requireVerifiedLogin(dto.mobile, dto.code);
    const existing = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile },
      include: { providerProfile: true },
    });
    if (existing) {
      this.assertLoginAllowed(existing.status);
      return this.issueSession(existing, {
        deviceId: dto.deviceId,
        channel: dto.channel ?? AuthChannel.WEB,
      });
    }

    const city = await this.prisma.city.findFirst({
      where: { id: dto.cityId, isVisible: true },
    });
    if (!city) {
      throw new BadRequestException("المدينة غير متاحة");
    }

    const displayName = await assertUniqueDisplayName(this.prisma, dto.accountType, dto.displayName);
    const email = await assertUniqueEmail(this.prisma, dto.email);
    const termsVersion = await this.prisma.getSettingInt("terms_version", 1);

    const count = await this.prisma.user.count({
      where: { accountType: dto.accountType },
    });
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 12);
    const status =
      dto.accountType === AccountType.CUSTOMER ? AccountStatus.ACTIVE : AccountStatus.INACTIVE;

    const user = await this.prisma.user
      .create({
        data: {
          accountType: dto.accountType,
          mobile: dto.mobile,
          email,
          passwordHash,
          status,
          displayName,
          accountCode: this.prisma.nextAccountCode(dto.accountType, count),
          mobileVerifiedAt: new Date(),
          termsAcceptedAt: new Date(),
          termsVersion,
          customerProfile:
            dto.accountType === AccountType.CUSTOMER ? { create: { cityId: dto.cityId } } : undefined,
          providerProfile:
            dto.accountType === AccountType.PROVIDER
              ? { create: { visibility: "HIDDEN", cityId: dto.cityId, whatsapp: dto.mobile } }
              : undefined,
          statusHistory: {
            create: {
              fromStatus: AccountStatus.INACTIVE,
              toStatus: status,
              reason: "phone-otp",
            },
          },
        },
        include: { providerProfile: true },
      })
      .catch((error: unknown) => this.rethrowUnique(error));

    return this.issueSession(user, {
      deviceId: dto.deviceId,
      channel: dto.channel ?? AuthChannel.WEB,
    });
  }

  async sendOtp(dto: SendOtpDto) {
    await this.assertNotBanned(dto.mobile);
    const otp = await this.issueOtp(dto.mobile, dto.purpose);
    return { otpExpiresIn: otp.ttlSeconds };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const latest = await this.prisma.otpRequest.findFirst({
      where: { mobile: dto.mobile, purpose: dto.purpose },
      orderBy: { createdAt: "desc" },
    });
    if (!latest) {
      throw new BadRequestException("لا يوجد رمز تحقق");
    }
    if (latest.lockedUntil && latest.lockedUntil > new Date()) {
      throw new ForbiddenException("تم إيقاف المحاولة لمدة 30 دقيقة");
    }
    if (latest.expiresAt < new Date()) {
      throw new BadRequestException("انتهت صلاحية الرمز");
    }

    const maxAttempts = Number(this.config.get("OTP_MAX_ATTEMPTS") ?? 3);
    if (this.hashOtp(dto.code) !== latest.codeHash) {
      const attempts = latest.attempts + 1;
      const lockMinutes = Number(this.config.get("OTP_LOCK_MINUTES") ?? 30);
      await this.prisma.otpRequest.update({
        where: { id: latest.id },
        data: {
          attempts,
          lockedUntil:
            attempts >= maxAttempts
              ? new Date(Date.now() + lockMinutes * 60 * 1000)
              : null,
        },
      });
      throw new BadRequestException("رمز التحقق غير صحيح");
    }

    await this.prisma.otpRequest.update({
      where: { id: latest.id },
      data: { verifiedAt: new Date() },
    });

    if (dto.purpose === OtpPurpose.REGISTER) {
      await this.prisma.user.updateMany({
        where: { mobile: dto.mobile },
        data: { mobileVerifiedAt: new Date() },
      });
    }

    return { verified: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: { include: { city: true } },
        providerProfile: { include: { city: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException("الحساب غير موجود");
    }
    const pending = await pendingChangesFor(this.prisma, user.id);
    const displayName =
      pendingValue(pending, ProfileChangeField.DISPLAY_NAME) ?? user.displayName;
    const email = pendingValue(pending, ProfileChangeField.EMAIL) ?? user.email;
    return {
      id: user.id,
      accountType: user.accountType,
      status: user.status,
      displayName,
      mobile: user.mobile,
      email,
      accountCode: user.accountCode,
      city: user.customerProfile?.city ?? user.providerProfile?.city ?? null,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      pendingChanges: pending,
    };
  }

  async logout(userId: string, deviceId?: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(deviceId ? { deviceId } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile },
    });
    if (!user) {
      throw new BadRequestException("الحساب غير موجود");
    }
    const otp = await this.issueOtp(dto.mobile, OtpPurpose.RESET_PASSWORD);
    return { otpExpiresIn: otp.ttlSeconds };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.verifyOtp({
      mobile: dto.mobile,
      purpose: OtpPurpose.RESET_PASSWORD,
      code: dto.code,
    });
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const result = await this.prisma.user.updateMany({
      where: { mobile: dto.mobile },
      data: { passwordHash },
    });
    if (result.count === 0) {
      throw new BadRequestException("الحساب غير موجود");
    }
    return { ok: true };
  }

  private async issueOtp(mobile: string, purpose: OtpPurposeValue) {
    const ttlSeconds = Number(
      this.config.get("OTP_TTL_SECONDS") ?? (await this.prisma.getSetting("otp_ttl_seconds", "120")),
    );
    const latest = await this.prisma.otpRequest.findFirst({
      where: { mobile, purpose },
      orderBy: { createdAt: "desc" },
    });
    if (latest?.lockedUntil && latest.lockedUntil > new Date()) {
      throw new ForbiddenException("تم إيقاف المحاولة لمدة 30 دقيقة");
    }

    const code =
      this.config.get<string>("OTP_DEV_CODE") ||
      String(randomInt(100000, 1000000));
    const otp = await this.prisma.otpRequest.create({
      data: {
        mobile,
        purpose,
        codeHash: this.hashOtp(code),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    await this.sms.send(mobile, `رمز أنوثتي: ${code}`);
    return { id: otp.id, ttlSeconds };
  }

  private async requireVerifiedLogin(mobile: string, code: string) {
    const latest = await this.prisma.otpRequest.findFirst({
      where: { mobile, purpose: OtpPurpose.LOGIN },
      orderBy: { createdAt: "desc" },
    });
    if (!latest?.verifiedAt) {
      throw new BadRequestException("أكدِ رمز التحقق أولًا");
    }
    if (this.hashOtp(code) !== latest.codeHash) {
      throw new BadRequestException("رمز التحقق غير صحيح");
    }
    const windowMs = 30 * 60 * 1000;
    if (Date.now() - latest.verifiedAt.getTime() > windowMs) {
      throw new BadRequestException("انتهت صلاحية الرمز");
    }
  }

  private async issueSession(
    user: {
      id: string;
      accountType: string;
      status: string;
      displayName: string;
      accountCode: string;
      providerProfile?: { visibility?: string | null } | null;
    },
    device?: { deviceId?: string; channel?: string },
  ) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date(), mobileVerifiedAt: new Date() },
    });
    const channel = device?.channel ?? AuthChannel.WEB;
    if (device?.deviceId) {
      await this.prisma.session.updateMany({
        where: {
          userId: user.id,
          deviceId: device.deviceId,
          channel,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
    const days = 30;
    await this.prisma.session.create({
      data: {
        userId: user.id,
        device: device?.deviceId ?? null,
        deviceId: device?.deviceId ?? null,
        channel,
        refreshTokenHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });
    const token = await this.jwt.signAsync({
      sub: user.id,
      accountType: user.accountType,
      status: user.status,
    });
    return {
      accessToken: token,
      otpRequired: false,
      user: {
        id: user.id,
        accountType: user.accountType,
        status: user.status,
        displayName: user.displayName,
        accountCode: user.accountCode,
        visible: this.prisma.isPubliclyVisible({
          status: user.status,
          visibility: user.providerProfile?.visibility,
        }),
      },
    };
  }

  private async findTrustedDevice(userId: string, deviceId: string, channel: string) {
    return this.prisma.session.findFirst({
      where: {
        userId,
        deviceId,
        channel,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  private async assertNotBanned(mobile: string) {
    const banned = await this.prisma.bannedPhone.findUnique({
      where: { mobile },
    });
    if (banned) {
      throw new ForbiddenException("هذا الرقم محظور");
    }
  }

  private assertLoginAllowed(status: string) {
    if (
      status === AccountStatus.SUSPENDED ||
      status === AccountStatus.DELETED ||
      status === AccountStatus.CANCELLED
    ) {
      throw new ForbiddenException("الحساب غير مسموح له بالدخول");
    }
  }

  private rethrowUnique(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictException("البيانات مسجلة بالفعل");
    }
    throw error;
  }

  private hashOtp(code: string) {
    const pepper = this.config.get<string>("OTP_PEPPER") ?? "";
    return createHash("sha256").update(`${code}:${pepper}`).digest("hex");
  }
}
