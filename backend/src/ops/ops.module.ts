import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OpsController } from "./ops.controller";
import { OpsService } from "./ops.service";
import { PermissionGuard, StaffGuard } from "./ops.guard";

@Module({
  imports: [AuthModule],
  controllers: [OpsController],
  providers: [OpsService, StaffGuard, PermissionGuard],
})
export class OpsModule {}
