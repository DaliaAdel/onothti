import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
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
}

export class AddProviderServiceDto {
  @ApiPropertyOptional({ description: "معرّف الخدمة" })
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subServiceId?: string;
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
