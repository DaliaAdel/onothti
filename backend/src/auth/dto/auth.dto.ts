import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsSaudiMobile } from "../../common/mobile";

export class RegisterDto {
  @ApiProperty({ enum: ["CUSTOMER", "PROVIDER"] })
  @IsIn(["CUSTOMER", "PROVIDER"])
  accountType!: "CUSTOMER" | "PROVIDER";

  @ApiProperty({ example: "نورة" })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsSaudiMobile()
  mobile!: string;

  @ApiProperty({ example: "Secret123" })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}

export class LoginDto {
  @IsSaudiMobile()
  mobile!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}

export class SendOtpDto {
  @IsSaudiMobile()
  mobile!: string;

  @ApiProperty({ enum: ["REGISTER", "LOGIN_NEW_DEVICE", "RESET_PASSWORD", "FIRST_BROWSER"] })
  @IsIn(["REGISTER", "LOGIN_NEW_DEVICE", "RESET_PASSWORD", "FIRST_BROWSER"])
  purpose!: "REGISTER" | "LOGIN_NEW_DEVICE" | "RESET_PASSWORD" | "FIRST_BROWSER";
}

export class VerifyOtpDto extends SendOtpDto {
  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(4)
  code!: string;
}

export class ResetPasswordDto {
  @IsSaudiMobile()
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
  @IsSaudiMobile()
  mobile!: string;
}
