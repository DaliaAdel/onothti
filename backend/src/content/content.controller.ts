import { Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { LegalAudienceDto } from "./dto/legal-query.dto";

@ApiTags("content")
@Controller()
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("legal/terms")
  terms(@Query() query: LegalAudienceDto) {
    return this.legalPage(`TERMS_${query.audience}`, query.audience);
  }

  @Get("legal/policies")
  policies(@Query() query: LegalAudienceDto) {
    return this.legalPage(`POLICIES_${query.audience}`, query.audience);
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

  private async legalPage(code: string, audience: "CUSTOMER" | "PROVIDER") {
    const page = await this.prisma.legalPage.findUnique({ where: { code } });
    if (!page) {
      throw new NotFoundException("الصفحة غير موجودة");
    }
    return { ...page, audience };
  }
}
