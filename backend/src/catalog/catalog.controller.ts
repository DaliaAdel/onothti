import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { liveCampaign } from "../common/account-rules";
import { serializePackage } from "../common/package-price";
import { idlePeriodFor, LIMIT_DEFAULTS, settingMaxChars } from "../common/platform-settings";
import { withServiceImageUrls } from "../common/service-image";

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
  async services() {
    const rows = await this.prisma.service.findMany({
      where: { isVisible: true },
      include: {
        subServices: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    return withServiceImageUrls(this.prisma, rows);
  }

  @Get("packages")
  async packages() {
    const rows = await this.prisma.package.findMany({
      where: { isActive: true },
      orderBy: { rank: "asc" },
    });
    return rows.map(serializePackage);
  }

  @Get("campaign")
  campaign() {
    return liveCampaign(this.prisma);
  }

  @Get("settings")
  async settings() {
    const [extensionMonths, idleCustomer, idleProvider, termsVersion, ratingNoteMax, providerBioMax, customerBioMax] =
      await Promise.all([
        this.prisma.getSettingInt("package_extension_months", 1),
        idlePeriodFor(this.prisma, "customer"),
        idlePeriodFor(this.prisma, "provider"),
        this.prisma.getSettingInt("terms_version", 1),
        settingMaxChars(this.prisma, "rating_note_max", LIMIT_DEFAULTS.rating_note_max),
        settingMaxChars(this.prisma, "provider_bio_max", LIMIT_DEFAULTS.provider_bio_max),
        settingMaxChars(this.prisma, "customer_bio_max", LIMIT_DEFAULTS.customer_bio_max),
      ]);
    return {
      extensionMonths,
      idleAfterDays: idleProvider.amount,
      idleCustomerAfter: idleCustomer.amount,
      idleCustomerUnit: idleCustomer.unit,
      idleProviderAfter: idleProvider.amount,
      idleProviderUnit: idleProvider.unit,
      termsVersion,
      ratingNoteMax,
      providerBioMax,
      customerBioMax,
    };
  }
}
