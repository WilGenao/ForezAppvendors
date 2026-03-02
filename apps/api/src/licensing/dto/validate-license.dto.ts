import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateLicenseDto {
  @ApiProperty() @IsString() @Length(32, 64) licenseKey: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200) hwidHash?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mtAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^MT[45]$/) mtPlatform?: string;
}
