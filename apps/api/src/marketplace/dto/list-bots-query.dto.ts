import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListBotsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ enum: ['MT4','MT5','BOTH'] }) @IsOptional() @IsIn(['MT4','MT5','BOTH']) mtPlatform?: string;
  @ApiPropertyOptional({ enum: ['subscription_monthly','subscription_yearly','one_time'] }) @IsOptional() listingType?: string;
  @ApiPropertyOptional({ enum: ['rating','subscribers','price_asc','price_desc','newest'] }) @IsOptional() sortBy?: string;
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 20;
}
