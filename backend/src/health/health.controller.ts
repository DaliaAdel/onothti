import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let db: "up" | "down" = "down";
    let dbError: string | undefined;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = "up";
    } catch (error) {
      db = "down";
      const message = error instanceof Error ? error.message : "unknown";
      dbError = message.replace(/mysql:\/\/[^@\s]+@/g, "mysql://***@");
    }

    return {
      ok: db === "up",
      service: "onothiti-api",
      db,
      host: process.env.MYSQL_HOST ?? null,
      ...(dbError ? { dbError } : {}),
    };
  }
}
