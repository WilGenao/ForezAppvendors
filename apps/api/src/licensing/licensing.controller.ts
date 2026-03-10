// apps/api/src/licensing/licensing.controller.ts
// EXTENDED — adds GET /licenses/my and POST /licenses/revoke/:id
// Original POST /licensing/validate preserved.

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Ip,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiSecurity, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LicensingService } from './licensing.service';
import { ValidateLicenseDto } from './dto/validate-license.dto';
import { RevokeLicenseDto } from './dto/revoke-license.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('licensing')
@Controller({ path: 'licensing', version: '1' })
export class LicensingController {
  constructor(private readonly licensingService: LicensingService) {}

  // ─── Public: MT4/MT5 validation endpoint ────────────────────────────────────

  /**
   * POST /licensing/validate
   * Called periodically from MetaTrader terminals. No JWT — uses licenseKey as auth.
   * Rate limited: 60 req/min per IP (Redis is the primary rate limiter internally).
   */
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a license key (called from MT4/MT5)' })
  validate(@Body() dto: ValidateLicenseDto, @Ip() ip: string) {
    return this.licensingService.validate(dto, ip);
  }

  // ─── Authenticated: buyer endpoints ─────────────────────────────────────────

  /**
   * GET /licensing/my
   * Returns all licenses owned by the current user.
   */
  @Get('my')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get all licenses for the current user' })
  getMyLicenses(@CurrentUser() user: JwtPayload) {
    return this.licensingService.getMyLicenses(user.sub);
  }

  /**
   * POST /licensing/revoke/:id
   * Revoke a license. Users can revoke their own; admins can revoke any.
   */
  @Post('revoke/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a license (own licenses only, or admin)' })
  revoke(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) licenseId: string,
    @Body() dto: RevokeLicenseDto,
  ) {
    return this.licensingService.revoke(licenseId, user.sub, user.roles, dto.reason);
  }
}
