import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProviderController } from "./provider.controller";
import { ProviderService } from "./provider.service";

@Module({
  imports: [AuthModule],
  controllers: [ProviderController],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {}
