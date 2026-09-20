import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, OptionalJwtGuard } from "./jwt-auth.guard";
import { DevSmsProvider, SmsProvider } from "./sms/sms.provider";

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET") ?? "dev-secret",
        signOptions: { expiresIn: "7d" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    OptionalJwtGuard,
    { provide: SmsProvider, useClass: DevSmsProvider },
  ],
  exports: [JwtAuthGuard, OptionalJwtGuard],
})
export class AuthModule {}
