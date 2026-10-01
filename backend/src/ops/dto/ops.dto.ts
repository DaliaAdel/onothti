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

export class ReviewChangeDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  approve?: boolean;
}
