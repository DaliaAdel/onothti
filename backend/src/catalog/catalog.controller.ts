import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("catalog")
@Controller("catalog")
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("cities")
  cities() {
    return this.prisma.city.findMany({
      where: { isVisible: true },
      include: { region: true },
      orderBy: { nameAr: "asc" },
    });
  }

  @Get("services")
  services() {
    return this.prisma.service.findMany({
      where: { isVisible: true },
      include: {
        subServices: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  @Get("packages")
  packages() {
    return this.prisma.package.findMany({
      where: { isActive: true },
      orderBy: { rank: "asc" },
    });
  }
}
