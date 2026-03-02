import { IsString, IsNotEmpty, MaxLength, IsArray, IsIn, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBotDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) shortDescription: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: ['MT4','MT5','BOTH'] }) @IsIn(['MT4','MT5','BOTH']) mtPlatform: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) currencyPairs: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) timeframes: string[];
  @ApiPropertyOptional({ minimum: 1, maximum: 5 }) @IsOptional() @IsInt() @Min(1) @Max(5) riskLevel?: number;
}
