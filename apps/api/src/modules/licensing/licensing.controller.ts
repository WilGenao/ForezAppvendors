import { Controller, Post, Body, UseGuards, Get, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LicensingService } from './licensing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

class ValidateLicenseDto {
  licenseKey: string;
  accountId: string;
  brokerName: string;
  mtVersion: string;
}

class CreateApiKeyDto {
  name: string;
  scopes: string[];
  expiresAt?: string;
}

@ApiTags('Licensing')
@Controller('licensing')
export class LicensingController {
  constructor(private licensingService: LicensingService) {}

  // Este endpoint es llamado desde MT4/5 — necesita ser rápido y sin autenticación JWT
  // La "autenticación" es la license_key misma + rate limiting
  @Post('validate')
  @HttpCode(200)
  @Throttle({ short: { limit: 20, ttl: 1000 } }) // Additional layer — 20/sec global
  @ApiOperation({ summary: 'Validate a license key (called from MT4/5)' })
  validateLicense(@Body() dto: ValidateLicenseDto, @Body('ipAddress') ip: string) {
    return this.licensingService.validateLicense(
      dto.licenseKey, dto.accountId, dto.brokerName, dto.mtVersion, ip ?? '0.0.0.0',
    );
  }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post('api-keys')
  @ApiOperation({ summary: 'Create API key for seller track record submission' })
  createApiKey(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateApiKeyDto) {
    return this.licensingService.createApiKey(user.sub, dto.name, dto.scopes, dto.expiresAt ? new Date(dto.expiresAt) : undefined);
  }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Get('my-licenses')
  @ApiOperation({ summary: 'Get all active licenses for current buyer' })
  getMyLicenses(@CurrentUser() user: CurrentUserPayload) {
    return this.licensingService.getUserLicenses(user.sub);
  }
}
