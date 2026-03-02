import { IsEmail, IsString, MinLength, MaxLength, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8, maxLength: 72 }) @IsString() @MinLength(8) @MaxLength(72) password: string;
  @ApiProperty({ enum: ['buyer', 'seller'] }) @IsIn(['buyer', 'seller']) role: 'buyer' | 'seller';
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) displayName?: string;
}
