import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateSettingDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  value!: string;
}

export class PatchCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  benefitDays?: number;
}

export class UpsertWelcomeDto {
  @ApiProperty()
  @IsString()
  audience!: string;

  @ApiProperty()
  @IsString()
  kind!: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  bodyAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertRegionDto {
  @ApiProperty({ example: "EAS" })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: "الشرقية" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiPropertyOptional({ example: "Eastern" })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class PatchRegionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class CreateCityDto {
  @ApiProperty()
  @IsString()
  regionId!: string;

  @ApiProperty({ example: "DHAHRAN" })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: "الظهران" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiPropertyOptional({ example: "Dhahran" })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class PatchCityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class ReviewChangeDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  approve?: boolean;
}
