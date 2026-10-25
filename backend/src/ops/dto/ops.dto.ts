import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TICKET_TYPE_CATALOG } from "../../common/ticket-types";

const STAFF_TICKET_CODES = TICKET_TYPE_CATALOG.filter((item) => item.audience === "STAFF").map((item) => item.code);

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
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  benefitDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  packageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clipToEndDate?: boolean;
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

export class PatchWelcomeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  audience?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(4)
  bodyAr?: string;

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
  @ApiPropertyOptional({ example: "EAS" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiProperty({ example: "الشرقية" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiProperty({ example: "Eastern" })
  @IsString()
  @MinLength(2)
  nameEn!: string;

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
  @MinLength(2)
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

  @ApiPropertyOptional({ example: "DHAHRAN" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiProperty({ example: "الظهران" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiProperty({ example: "Dhahran" })
  @IsString()
  @MinLength(2)
  nameEn!: string;

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
  @MinLength(2)
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

  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  reopen?: boolean;
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

  @ApiPropertyOptional({ description: "إعادة العنصر للمراجعة" })
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  reopen?: boolean;
}

export class ReviewProviderDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  approve?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  reopen?: boolean;
}

export class UpsertPackageDto {
  @ApiPropertyOptional({ example: "GOLD" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

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
  priceBefore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

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

  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  isPromotional?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];
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
  priceBefore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

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

  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  isPromotional?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];
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
  @IsDate()
  startDate!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  benefitDays!: number;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  packageId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clipToEndDate?: boolean;
}

export class ReviewRatingDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  approve?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsOptional()
  @IsBoolean()
  reopen?: boolean;
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  titleAr?: string;
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titleAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  resetPassword?: boolean;
}

export class UpsertStaffDepartmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiProperty({ example: "التشغيل" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiProperty({ example: "Operations" })
  @IsString()
  @MinLength(2)
  nameEn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PatchStaffDepartmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertStaffTeamDto {
  @ApiProperty()
  @IsString()
  departmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiProperty({ example: "فريق التشغيل الأول" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiProperty({ example: "Operations Team 1" })
  @IsString()
  @MinLength(2)
  nameEn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadUserId?: string;
}

export class PatchStaffTeamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadUserId?: string | null;
}

export class PatchMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;
}

export class PatchRolePermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionCodes!: string[];
}

export class PatchStaffPermissionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  resetToRole?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];
}

export class CreateLegalDto {
  @ApiProperty({ enum: ["CUSTOMER", "PROVIDER", "STAFF"] })
  @IsIn(["CUSTOMER", "PROVIDER", "STAFF"])
  audience!: "CUSTOMER" | "PROVIDER" | "STAFF";

  @ApiProperty({ enum: ["TERMS", "POLICIES", "PRIVACY", "OTHER"] })
  @IsIn(["TERMS", "POLICIES", "PRIVACY", "OTHER"])
  kind!: "TERMS" | "POLICIES" | "PRIVACY" | "OTHER";

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PatchLegalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  titleAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(4)
  bodyAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  titleEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyEn?: string;

  @ApiPropertyOptional({ enum: ["CUSTOMER", "PROVIDER", "STAFF"] })
  @IsOptional()
  @IsIn(["CUSTOMER", "PROVIDER", "STAFF"])
  audience?: "CUSTOMER" | "PROVIDER" | "STAFF";

  @ApiPropertyOptional({ enum: ["TERMS", "POLICIES", "PRIVACY", "OTHER"] })
  @IsOptional()
  @IsIn(["TERMS", "POLICIES", "PRIVACY", "OTHER"])
  kind?: "TERMS" | "POLICIES" | "PRIVACY" | "OTHER";

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertServiceDto {
  @ApiPropertyOptional({ example: "HAIR" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiProperty({ example: "الشعر" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiProperty({ example: "Hair" })
  @IsString()
  @MinLength(2)
  nameEn!: string;

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
  @MinLength(2)
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
  @ApiPropertyOptional({ example: "HAIR-CUT" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiProperty({ example: "قص شعر" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiProperty({ example: "Haircut" })
  @IsString()
  @MinLength(2)
  nameEn!: string;

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
  @MinLength(2)
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

  @ApiPropertyOptional({ example: "NORTH" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiProperty({ example: "شمال المدينة" })
  @IsString()
  @MinLength(2)
  nameAr!: string;

  @ApiProperty({ example: "North" })
  @IsString()
  @MinLength(2)
  nameEn!: string;

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
  @MinLength(2)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

const BANK_LETTERS_PATTERN = /^[\p{L}]+(?:\s+[\p{L}]+)*$/u;
const BANK_IBAN_PATTERN = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{15,34}$/;

function toBankLetters(value: unknown): string {
  return String(value ?? "")
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toBankIban(value: unknown): string {
  return String(value ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function optionalBankLetters(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return toBankLetters(value) || undefined;
}

function optionalBankIban(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return toBankIban(value) || undefined;
}

export class UpsertBankDto {
  @ApiProperty()
  @Transform(({ value }) => toBankLetters(value))
  @IsString()
  @MinLength(2, { message: "اسم البنك حروف فقط" })
  @Matches(BANK_LETTERS_PATTERN, { message: "اسم البنك حروف فقط" })
  bankName!: string;

  @ApiProperty()
  @Transform(({ value }) => toBankIban(value))
  @IsString()
  @MinLength(15, { message: "الآيبان مزيج من الحروف والأرقام" })
  @MaxLength(34, { message: "الآيبان مزيج من الحروف والأرقام" })
  @Matches(BANK_IBAN_PATTERN, { message: "الآيبان مزيج من الحروف والأرقام" })
  iban!: string;

  @ApiProperty()
  @Transform(({ value }) => toBankLetters(value))
  @IsString()
  @MinLength(2, { message: "اسم المستفيد حروف فقط" })
  @Matches(BANK_LETTERS_PATTERN, { message: "اسم المستفيد حروف فقط" })
  accountName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PatchBankDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => optionalBankLetters(value))
  @IsString()
  @MinLength(2, { message: "اسم البنك حروف فقط" })
  @Matches(BANK_LETTERS_PATTERN, { message: "اسم البنك حروف فقط" })
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => optionalBankIban(value))
  @IsString()
  @MinLength(15, { message: "الآيبان مزيج من الحروف والأرقام" })
  @MaxLength(34, { message: "الآيبان مزيج من الحروف والأرقام" })
  @Matches(BANK_IBAN_PATTERN, { message: "الآيبان مزيج من الحروف والأرقام" })
  iban?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => optionalBankLetters(value))
  @IsString()
  @MinLength(2, { message: "اسم المستفيد حروف فقط" })
  @Matches(BANK_LETTERS_PATTERN, { message: "اسم المستفيد حروف فقط" })
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

export class CreateOpsTicketDto {
  @ApiProperty({ enum: STAFF_TICKET_CODES, example: "AD-06" })
  @IsIn(STAFF_TICKET_CODES)
  typeCode!: string;

  @ApiProperty({ example: "تعطل تسجيل الدخول" })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;
}

export class PatchTicketDto {
  @ApiPropertyOptional({ enum: ["SENT", "IN_PROGRESS", "RESOLVED", "CLOSED"] })
  @IsOptional()
  @IsIn(["SENT", "IN_PROGRESS", "RESOLVED", "CLOSED"])
  status?: "SENT" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

  @ApiPropertyOptional({ description: "1 = مصعّد" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ enum: ["OPS", "FINANCE", "ADMIN"] })
  @IsOptional()
  @IsIn(["OPS", "FINANCE", "ADMIN"])
  queue?: "OPS" | "FINANCE" | "ADMIN";

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  claim?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  note?: string;
}

export class CreateTicketCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  body!: string;
}

export class PatchAccountDto {
  @ApiPropertyOptional({ enum: ["ACTIVE", "RESTRICTED", "SUSPENDED", "CANCELLED", "DELETED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "RESTRICTED", "SUSPENDED", "CANCELLED", "DELETED"])
  status?: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "CANCELLED" | "DELETED";

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsString()
  packageId?: string;

  @ApiProperty({ description: "سبب الإجراء ويُحفظ في سجل الأحداث" })
  @IsString()
  @MinLength(4)
  reason!: string;

  @ApiPropertyOptional({ enum: ["PUBLIC", "LIMITED", "HIDDEN"] })
  @IsOptional()
  @IsIn(["PUBLIC", "LIMITED", "HIDDEN"])
  visibility?: "PUBLIC" | "LIMITED" | "HIDDEN";
}

export class NotifyAccountDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  titleAr!: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  bodyAr!: string;
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
