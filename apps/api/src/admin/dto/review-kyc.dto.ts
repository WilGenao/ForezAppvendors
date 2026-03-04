// apps/api/src/admin/dto/review-kyc.dto.ts
import { IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewKycDto {
  @ApiProperty({ example: 'Document is expired or unreadable.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
