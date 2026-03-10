// apps/api/src/licensing/dto/revoke-license.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RevokeLicenseDto {
  @ApiPropertyOptional({
    description: 'Reason for revoking the license',
    example: 'Device transferred or sold.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
