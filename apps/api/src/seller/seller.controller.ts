// apps/api/src/seller/seller.controller.ts
import { Controller, Get, Post, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SellerService } from './seller.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('seller')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('seller')
@Controller({ path: 'seller', version: '1' })
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Seller dashboard: revenue, bots, Stripe balance' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.sellerService.getDashboard(user.sub);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Paginated list of recent sales' })
  getRecentSales(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.sellerService.getRecentSales(user.sub, +page, +limit);
  }

  @Post('stripe/onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Stripe Connect onboarding URL' })
  getStripeOnboarding(@CurrentUser() user: JwtPayload) {
    return this.sellerService.getStripeOnboardingUrl(user.sub);
  }
}
