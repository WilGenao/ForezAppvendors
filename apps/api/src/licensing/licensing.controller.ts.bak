import { Controller, Post, Body, UseGuards, Ip, HttpCode, HttpStatus, Get, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { LicensingService } from './licensing.service';
import { ValidateLicenseDto } from './dto/validate-license.dto';

@ApiTags('licensing')
@Controller({ path: 'licensing', version: '1' })
export class LicensingController {
  constructor(private readonly licensingService: LicensingService) {}

  /**
   * Endpoint de validación: llamado desde MT4/5.
   * Throttle aquí es la segunda línea de defensa (Redis es la primera).
   * 60 req/min por IP es generoso para uso legítimo de múltiples bots.
   * No requiere JWT — usa licenseKey como auth implícito.
   */
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body() dto: ValidateLicenseDto, @Ip() ip: string) {
    return this.licensingService.validate(dto, ip);
  }
}
