import { Transform } from "class-transformer";
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

function emptyToUndefined({ value }: { value: unknown }) {
  return value === "" || value == null ? undefined : value;
}

export class RegisterDto {
  @ApiProperty({ enum: ["CUSTOMER", "PROVIDER"] })
  @IsIn(["CUSTOMER", "PROVIDER"])
  accountType!: "CUSTOMER" | "PROVIDER";

  @ApiProperty({ example: "نورة" })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiProperty({ example: "0501234567" })
  @Matches(/^05[0-9]{8}$/, { message: "رقم الجوال لازم يكون سعودي 10 أرقام ويبدأ بـ 05" })
  mobile!: string;

  @ApiPropertyOptional({ example: "Secret123" })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail({}, { message: "البريد الإلكتروني غير صحيح" })
  email?: string;

  @ApiProperty({ description: "الموافقة على الشروط" })
  @IsBoolean()
  @Equals(true, { message: "يجب الموافقة على الشروط والأحكام" })
  acceptTerms!: boolean;
}

export class LoginDto {
  @ApiProperty({ example: "0501234567" })
  @Matches(/^05[0-9]{8}$/)
  mobile!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ enum: ["WEB", "APP"] })
  @IsOptional()
  @IsIn(["WEB", "APP"])
  channel?: "WEB" | "APP";
}

export class SendOtpDto {
  @ApiProperty({ example: "0501234567" })
  @Matches(/^05[0-9]{8}$/)
  mobile!: string;

  @ApiProperty({ enum: ["REGISTER", "LOGIN", "LOGIN_NEW_DEVICE", "RESET_PASSWORD", "FIRST_BROWSER"] })
  @IsIn(["REGISTER", "LOGIN", "LOGIN_NEW_DEVICE", "RESET_PASSWORD", "FIRST_BROWSER"])
  purpose!: "REGISTER" | "LOGIN" | "LOGIN_NEW_DEVICE" | "RESET_PASSWORD" | "FIRST_BROWSER";
}

export class PhoneStartDto {
  @ApiProperty({ example: "0501234567" })
  @Matches(/^05[0-9]{8}$/, { message: "رقم الجوال لازم يكون سعودي 10 أرقام ويبدأ بـ 05" })
  mobile!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  deviceId?: string;

  @ApiPropertyOptional({ enum: ["WEB", "APP"] })
  @IsOptional()
  @IsIn(["WEB", "APP"])
  channel?: "WEB" | "APP";
}

export class PhoneVerifyDto extends PhoneStartDto {
  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(4)
  code!: string;
}

export class PhoneCompleteDto extends PhoneVerifyDto {
  @ApiProperty({ enum: ["CUSTOMER", "PROVIDER"] })
  @IsIn(["CUSTOMER", "PROVIDER"])
  accountType!: "CUSTOMER" | "PROVIDER";

  @ApiProperty({ example: "نورة" })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiProperty({ example: "uuid" })
  @IsString()
  @MinLength(8)
  cityId!: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail({}, { message: "البريد الإلكتروني غير صحيح" })
  email?: string;

  @ApiProperty({ description: "الموافقة على الشروط" })
  @IsBoolean()
  @Equals(true, { message: "يجب الموافقة على الشروط والأحكام" })
  acceptTerms!: boolean;
}

export class VerifyOtpDto extends SendOtpDto {
  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(4)
  code!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: "0501234567" })
  @Matches(/^05[0-9]{8}$/)
  mobile!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(4)
  code!: string;

  @ApiProperty({ example: "Secret1234" })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "0501234567" })
  @Matches(/^05[0-9]{8}$/)
  mobile!: string;
}

export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}
