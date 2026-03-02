import { IsEmail, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
