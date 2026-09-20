import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthUser } from "./auth-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = this.readUser(request);
    if (!request.user) {
      throw new UnauthorizedException("سجّلي الدخول أولًا");
    }
    return true;
  }

  readUser(request: { headers: { authorization?: string } }): AuthUser | null {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return null;
    }
    try {
      return this.jwt.verify<AuthUser>(header.slice(7));
    } catch {
      return null;
    }
  }
}

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly jwtGuard: JwtAuthGuard) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = this.jwtGuard.readUser(request);
    return true;
  }
}
