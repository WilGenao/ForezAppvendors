// apps/api/src/marketplace/dto/submit-review.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitForReviewDto {
  @ApiPropertyOptional({
    description: 'Optional message to the moderation team',
    example: 'Ready for review. Backtests are attached.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
