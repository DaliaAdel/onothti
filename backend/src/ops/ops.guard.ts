import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AccountType } from "../common/enums";

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly jwt: JwtAuthGuard) {}

  canActivate(context: ExecutionContext) {
    this.jwt.canActivate(context);
    const request = context.switchToHttp().getRequest();
    if (request.user?.accountType !== AccountType.STAFF) {
      throw new ForbiddenException("صلاحيات التشغيل غير متاحة");
    }
    return true;
  }
}
