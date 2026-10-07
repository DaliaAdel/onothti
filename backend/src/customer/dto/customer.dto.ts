import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

function emptyToUndefined({ value }: { value: unknown }) {
  return value === "" || value == null ? undefined : value;
}

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

  @ApiPropertyOptional({ type: [String], description: "مدن الحساب داخل نفس المنطقة" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  cityIds?: string[];

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail({}, { message: "البريد الإلكتروني غير صحيح" })
  email?: string;
}

export class FavoriteDto {
  @ApiProperty({ enum: ["PROVIDER", "SERVICE"] })
  @IsIn(["PROVIDER", "SERVICE"])
  targetType!: "PROVIDER" | "SERVICE";

  @ApiProperty()
  @IsString()
  targetId!: string;
}

export class CreateCustomerTicketDto {
  @ApiProperty({ example: "CU-01" })
  @IsString()
  typeCode!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  body!: string;
}

export class CreateComplaintDto {
  @ApiProperty()
  @IsString()
  targetUserId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(400)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRef?: string;
}
