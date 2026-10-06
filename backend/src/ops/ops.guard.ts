import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AccountStatus, AccountType } from "../common/enums";
import { PrismaService } from "../prisma/prisma.service";

export const PERMISSION_KEY = "ops_permission";
export const RequirePermission = (...codes: string[]) => SetMetadata(PERMISSION_KEY, codes);

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtAuthGuard,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    this.jwt.canActivate(context);
    const request = context.switchToHttp().getRequest();
    if (request.user?.accountType !== AccountType.STAFF) {
      throw new ForbiddenException("صلاحيات التشغيل غير متاحة");
    }
    if (request.user.status && request.user.status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException("حساب التشغيل غير نشط");
    }
    const staff = await this.prisma.staffUser.findUnique({
      where: { userId: request.user.sub },
      include: {
        user: { select: { status: true } },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!staff || staff.user.status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException("صلاحيات التشغيل غير متاحة");
    }
    request.user.roleCode = staff.role.code;
    request.user.permissions = staff.role.permissions.map((row) => row.permission.code);
    return true;
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const needed = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!needed?.length) {
      return true;
    }
    const have: string[] = context.switchToHttp().getRequest().user?.permissions ?? [];
    if (needed.some((code) => have.includes(code))) {
      return true;
    }
    throw new ForbiddenException("ليست لديكِ صلاحية هذا الإجراء");
  }
}
