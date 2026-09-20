import { IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LegalAudienceDto {
  @ApiProperty({ enum: ["CUSTOMER", "PROVIDER"], description: "باحثة أو صانعة جمال" })
  @IsIn(["CUSTOMER", "PROVIDER"])
  audience!: "CUSTOMER" | "PROVIDER";
}
