import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Min, MinLength } from "class-validator";
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

export class ReviewMediaDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  approve?: boolean;

  @ApiPropertyOptional({ description: "طلب صورة أوضح للإيصال" })
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  requestClearer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  startAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  endAt?: Date;
}

export class ReviewProviderDto {
  @ApiProperty()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  approve!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpsertPackageDto {
  @ApiProperty({ example: "GOLD" })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMonths!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vatPercent?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rank!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxServices?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPhotos?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxVideos?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAlbums?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowWhatsApp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowRating?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasBadge?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PatchPackageDto {
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vatPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rank?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxServices?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPhotos?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxVideos?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAlbums?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowWhatsApp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowRating?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasBadge?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiProperty()
  @Type(() => Date)
  startDate!: Date;

  @ApiProperty()
  @Type(() => Date)
  endDate!: Date;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  benefitDays!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReviewRatingDto {
  @ApiProperty()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  approve!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class PatchComplaintDto {
  @ApiProperty({ enum: ["OPEN", "CLOSED", "ESCALATED"] })
  @IsIn(["OPEN", "CLOSED", "ESCALATED"])
  status!: "OPEN" | "CLOSED" | "ESCALATED";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateStaffDto {
  @ApiProperty({ example: "0500000002" })
  @Matches(/^05[0-9]{8}$/, { message: "رقم الجوال لازم يكون سعودي 10 أرقام ويبدأ بـ 05" })
  mobile!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  roleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team?: string;
}

export class PatchStaffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  roleId?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "SUSPENDED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "SUSPENDED"])
  status?: "ACTIVE" | "SUSPENDED";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  team?: string;
}

export class PatchRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionCodes!: string[];
}

export class PatchLegalDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  titleAr!: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  bodyAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titleEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyEn?: string;
}

export class UpsertServiceDto {
  @ApiProperty({ example: "HAIR" })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: "الشعر" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiPropertyOptional({ example: "Hair" })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class PatchServiceDto {
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
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpsertSubServiceDto {
  @ApiProperty({ example: "HAIR-CUT" })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: "قص شعر" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiPropertyOptional({ example: "Haircut" })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class PatchSubServiceDto {
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
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpsertCoverageDto {
  @ApiProperty()
  @IsString()
  cityId!: string;

  @ApiProperty({ example: "NORTH" })
  @IsString()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: "شمال المدينة" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class PatchCoverageDto {
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

export class UpsertBankDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  bankName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  iban!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  accountName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PatchBankDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  iban?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  accountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBannedPhoneDto {
  @ApiProperty({ example: "0501234567" })
  @Matches(/^05[0-9]{8}$/, { message: "رقم الجوال لازم يكون سعودي 10 أرقام ويبدأ بـ 05" })
  mobile!: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  reason!: string;
}

export class PatchTicketDto {
  @ApiProperty({ enum: ["SENT", "IN_PROGRESS", "RESOLVED", "CLOSED"] })
  @IsIn(["SENT", "IN_PROGRESS", "RESOLVED", "CLOSED"])
  status!: "SENT" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
}

export class CreateTicketCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  body!: string;
}

export class PatchAccountDto {
  @ApiProperty({ enum: ["ACTIVE", "RESTRICTED", "SUSPENDED", "CANCELLED", "DELETED"] })
  @IsIn(["ACTIVE", "RESTRICTED", "SUSPENDED", "CANCELLED", "DELETED"])
  status!: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "CANCELLED" | "DELETED";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ enum: ["PUBLIC", "LIMITED", "HIDDEN"] })
  @IsOptional()
  @IsIn(["PUBLIC", "LIMITED", "HIDDEN"])
  visibility?: "PUBLIC" | "LIMITED" | "HIDDEN";
}

export class BroadcastDto {
  @ApiProperty({ enum: ["CUSTOMER", "PROVIDER", "ALL"] })
  @IsIn(["CUSTOMER", "PROVIDER", "ALL"])
  audience!: "CUSTOMER" | "PROVIDER" | "ALL";

  @ApiProperty()
  @IsString()
  @MinLength(2)
  titleAr!: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  bodyAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titleEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyEn?: string;
}
