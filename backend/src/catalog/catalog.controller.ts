import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { liveCampaign } from "../common/account-rules";

@ApiTags("catalog")
@Controller("catalog")
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("regions")
  regions() {
    return this.prisma.region.findMany({
      where: { isVisible: true, cities: { some: { isVisible: true } } },
      include: {
        cities: {
          where: { isVisible: true },
          include: {
            coverageAreas: { where: { isVisible: true }, orderBy: { nameAr: "asc" } },
          },
          orderBy: { nameAr: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
    });
  }

  @Get("cities")
  cities() {
    return this.prisma.city.findMany({
      where: { isVisible: true },
      include: {
        region: true,
        coverageAreas: { where: { isVisible: true }, orderBy: { nameAr: "asc" } },
      },
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

  @Get("campaign")
  campaign() {
    return liveCampaign(this.prisma);
  }

  @Get("settings")
  async settings() {
    const [extensionMonths, idleAfterDays, termsVersion, ratingNoteMax] = await Promise.all([
      this.prisma.getSettingInt("package_extension_months", 1),
      this.prisma.getSettingInt("idle_after_days", 90),
      this.prisma.getSettingInt("terms_version", 1),
      this.prisma.getSettingInt("rating_note_max", 100),
    ]);
    return { extensionMonths, idleAfterDays, termsVersion, ratingNoteMax };
  }
}
