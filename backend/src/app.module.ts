import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ContentModule } from "./content/content.module";
import { CustomerModule } from "./customer/customer.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProviderModule } from "./provider/provider.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OpsModule } from "./ops/ops.module";
import { SetupModule } from "./setup/setup.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CatalogModule,
    DiscoveryModule,
    CustomerModule,
    ProviderModule,
    ContentModule,
    NotificationsModule,
    OpsModule,
    SetupModule,
  ],
})
export class AppModule {}
