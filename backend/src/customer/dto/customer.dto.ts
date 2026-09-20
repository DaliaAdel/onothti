import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityId?: string;
}

export class FavoriteDto {
  @ApiProperty({ enum: ["PROVIDER", "SERVICE"] })
  @IsIn(["PROVIDER", "SERVICE"])
  targetType!: "PROVIDER" | "SERVICE";

  @ApiProperty()
  @IsString()
  targetId!: string;
}
