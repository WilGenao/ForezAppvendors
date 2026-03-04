// apps/api/src/subscriptions/subscriptions.controller.ts
import { Controller, Get, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions + licenses for the current user' })
  getMySubscriptions(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getBuyerSubscriptions(user.sub);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.subscriptionsService.cancelSubscription(user.sub, id);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a pending-cancel subscription' })
  reactivate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.subscriptionsService.reactivateSubscription(user.sub, id);
  }

  @Get('billing-portal')
  @ApiOperation({ summary: 'Get Stripe billing portal URL' })
  billingPortal(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getBillingPortalUrl(user.sub);
  }
}
