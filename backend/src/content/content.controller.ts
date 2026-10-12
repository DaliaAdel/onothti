import { Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { LegalAudienceDto, WelcomeAudienceDto } from "./dto/legal-query.dto";

@ApiTags("content")
@Controller()
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("legal/terms")
  terms(@Query() query: LegalAudienceDto) {
    return this.legalPage("TERMS", query.audience);
  }

  @Get("legal/policies")
  policies(@Query() query: LegalAudienceDto) {
    return this.legalPage("POLICIES", query.audience);
  }

  @Get("legal/privacy")
  privacy(@Query() query: LegalAudienceDto) {
    return this.legalPage("PRIVACY", query.audience);
  }

  @Get("legal/page")
  page(@Query() query: LegalAudienceDto) {
    return this.legalPage(query.kind ?? "TERMS", query.audience);
  }

  @Get("settings/about")
  about() {
    return {
      nameAr: "أنوثتي",
      nameEn: "Onothiti",
      version: "0.1.0",
      descriptionAr: "دليل اكتشاف لصانعات الجمال داخل السعودية",
      descriptionEn: "A discovery directory for beauty providers in Saudi Arabia",
    };
  }

  @Get("content/welcome")
  async welcome(@Query() query: WelcomeAudienceDto) {
    const rows = await this.prisma.welcomeMessage.findMany({
      where: {
        isActive: true,
        audience: { in: [query.audience, "ALL"] },
      },
    });
    const pick = (kind: string) => {
      const pool = rows.filter((row) => row.kind === kind);
      if (!pool.length) {
        return null;
      }
      return pool[Math.floor(Math.random() * pool.length)];
    };
    return {
      welcome: pick("WELCOME"),
      motivational: pick("MOTIVATIONAL"),
    };
  }

  private async legalPage(kind: string, audience: "CUSTOMER" | "PROVIDER" | "STAFF") {
    const page = await this.prisma.legalPage.findFirst({
      where: { kind, audience, isActive: true },
      orderBy: { version: "desc" },
    });
    if (!page) {
      throw new NotFoundException("الصفحة غير موجودة");
    }
    return { ...page, audience };
  }
}
