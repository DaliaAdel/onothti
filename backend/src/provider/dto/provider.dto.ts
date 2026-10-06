import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class UpdateProviderProfileDto {
  @ApiPropertyOptional({ example: "لمسة ملكة" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: "0501234567" })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({ type: [String], description: "مدن الحساب داخل نفس المنطقة" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  cityIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}

export class AddProviderServiceDto {
  @ApiPropertyOptional({ description: "معرّف الخدمة الرئيسية" })
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional({ description: "معرّف الخدمة الفرعية — مطلوب" })
  @IsString()
  subServiceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceTo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class PatchProviderServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceTo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: "تفعيل أو إيقاف ظهور الخدمة" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderProviderServicesDto {
  @ApiProperty({ type: [String], description: "معرّفات الخدمات بالترتيب الجديد" })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
}

export class UpdateProviderCoverageDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  areaIds!: string[];
}

export class AddPortfolioDto {
  @ApiPropertyOptional({ example: "portfolio/work-1.jpg" })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ example: "image/jpeg" })
  @IsOptional()
  @IsString()
  mime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({ enum: ["IMAGE", "VIDEO"] })
  @IsOptional()
  @IsIn(["IMAGE", "VIDEO"])
  kind?: "IMAGE" | "VIDEO";

  @ApiPropertyOptional({ description: "معرّف الألبوم" })
  @IsOptional()
  @IsString()
  albumId?: string;
}

export class CreatePortfolioAlbumDto {
  @ApiProperty({ example: "مكياج عرائس" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}

export class PatchPortfolioAlbumDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SubmitPaymentProofDto {
  @ApiPropertyOptional({ description: "باقة الاشتراك المطلوبة" })
  @IsString()
  packageId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: "نص رسالة التحويل" })
  @IsOptional()
  @IsString()
  @MinLength(8)
  transferText?: string;

  @ApiPropertyOptional({ description: "رقم مرجع التحويل" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mime?: string;

  @ApiPropertyOptional({ enum: ["IMAGE", "PDF", "TEXT"] })
  @IsOptional()
  @IsIn(["IMAGE", "PDF", "TEXT"])
  kind?: "IMAGE" | "PDF" | "TEXT";

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}

export class CreateProviderTicketDto {
  @ApiPropertyOptional({ example: "BM-01" })
  @IsString()
  typeCode!: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(8)
  body!: string;
}
