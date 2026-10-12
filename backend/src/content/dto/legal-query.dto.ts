import { IsIn, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class WelcomeAudienceDto {
  @ApiProperty({ enum: ["CUSTOMER", "PROVIDER", "STAFF"] })
  @IsIn(["CUSTOMER", "PROVIDER", "STAFF"])
  audience!: "CUSTOMER" | "PROVIDER" | "STAFF";
}

export class LegalAudienceDto {
  @ApiProperty({ enum: ["CUSTOMER", "PROVIDER", "STAFF"], description: "عميلة أو خبيرة أو موظفو المنصة" })
  @IsIn(["CUSTOMER", "PROVIDER", "STAFF"])
  audience!: "CUSTOMER" | "PROVIDER" | "STAFF";

  @ApiPropertyOptional({ enum: ["TERMS", "POLICIES", "PRIVACY", "OTHER"] })
  @IsOptional()
  @IsIn(["TERMS", "POLICIES", "PRIVACY", "OTHER"])
  kind?: "TERMS" | "POLICIES" | "PRIVACY" | "OTHER";
}
