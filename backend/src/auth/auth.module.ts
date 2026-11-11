import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, OptionalJwtGuard } from "./jwt-auth.guard";
import { DevSmsProvider, SmsProvider } from "./sms/sms.provider";
import { TaqnyatSmsProvider } from "./sms/taqnyat.sms.provider";

function smsProviderFactory(config: ConfigService): SmsProvider {
  const named = (config.get<string>("SMS_PROVIDER") ?? "").trim().toLowerCase();
  const isProd = (config.get<string>("NODE_ENV") ?? process.env.NODE_ENV) === "production";
  if (named === "dev") {
    console.log("[SMS] provider=dev (console only)");
    return new DevSmsProvider();
  }
  if (named === "taqnyat" || isProd) {
    console.log("[SMS] provider=taqnyat");
    return new TaqnyatSmsProvider(config);
  }
  console.log("[SMS] provider=dev (console only)");
  return new DevSmsProvider();
}

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
    {
      provide: SmsProvider,
      inject: [ConfigService],
      useFactory: smsProviderFactory,
    },
  ],
  exports: [JwtAuthGuard, OptionalJwtGuard],
})
export class AuthModule {}
