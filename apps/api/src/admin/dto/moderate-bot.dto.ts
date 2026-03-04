// apps/api/src/admin/dto/moderate-bot.dto.ts
import { IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ModerateBotsDto {
  @ApiPropertyOptional({ example: 'Contains martingale pattern not disclosed in listing.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
