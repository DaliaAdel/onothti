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
import { createHash, randomInt } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SmsProvider } from "./sms/sms.provider";
import {
  LoginDto,
  RegisterDto,
  SendOtpDto,
  VerifyOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from "./dto/auth.dto";
import { AccountStatus, AccountType, OtpPurpose, type OtpPurposeValue } from "../common/enums";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sms: SmsProvider,
  ) {}

  async register(dto: RegisterDto) {
    const banned = await this.prisma.bannedPhone.findUnique({
      where: { mobile: dto.mobile },
    });
    if (banned) {
      throw new ForbiddenException("هذا الرقم محظور");
    }

    const existing = await this.prisma.user.findFirst({
      where: { mobile: dto.mobile },
    });
    if (existing) {
      throw new ConflictException("رقم الجوال مسجل بالفعل");
    }

    const count = await this.prisma.user.count({
      where: { accountType: dto.accountType },
    });
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const status =
      dto.accountType === AccountType.CUSTOMER
        ? AccountStatus.ACTIVE
        : AccountStatus.INACTIVE;

    const user = await this.prisma.user
      .create({
        data: {
          accountType: dto.accountType,
          mobile: dto.mobile,
          email: dto.email,
          passwordHash,
          status,
          displayName: dto.displayName,
          accountCode: this.prisma.nextAccountCode(dto.accountType, count),
          customerProfile:
            dto.accountType === AccountType.CUSTOMER ? { create: {} } : undefined,
          providerProfile:
            dto.accountType === AccountType.PROVIDER
              ? { create: { visibility: "HIDDEN" } }
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
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("رقم الجوال مسجل بالفعل");
        }
        throw error;
      });

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
    if (user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.DELETED) {
      throw new ForbiddenException("الحساب غير مسموح له بالدخول");
    }

    if (!user.mobileVerifiedAt) {
      throw new ForbiddenException("أكدِ رمز التحقق أولًا");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const token = await this.jwt.signAsync({
      sub: user.id,
      accountType: user.accountType,
      status: user.status,
    });

    return {
      accessToken: token,
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

  async sendOtp(dto: SendOtpDto) {
    const banned = await this.prisma.bannedPhone.findUnique({
      where: { mobile: dto.mobile },
    });
    if (banned) {
      throw new ForbiddenException("هذا الرقم محظور");
    }
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
    return {
      id: user.id,
      accountType: user.accountType,
      status: user.status,
      displayName: user.displayName,
      mobile: user.mobile,
      email: user.email,
      accountCode: user.accountCode,
      city: user.customerProfile?.city ?? user.providerProfile?.city ?? null,
    };
  }

  logout() {
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
    const ttlSeconds = Number(this.config.get("OTP_TTL_SECONDS") ?? 120);
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

  private hashOtp(code: string) {
    const pepper = this.config.get<string>("OTP_PEPPER") ?? "";
    return createHash("sha256").update(`${code}:${pepper}`).digest("hex");
  }
}
