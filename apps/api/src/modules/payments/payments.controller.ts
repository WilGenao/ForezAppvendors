import { Controller, Post, Body, UseGuards, Get, Param, Req, Headers, RawBodyRequest, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('checkout/:listingId')
  @ApiOperation({ summary: 'Create Stripe checkout session for a listing' })
  createCheckout(@CurrentUser() user: CurrentUserPayload, @Param('listingId') listingId: string) {
    return this.paymentsService.createCheckoutSession(user.sub, listingId);
  }

  // Webhook — NO JWT guard, validated by Stripe signature
  // Raw body is needed for signature verification — configured in main.ts
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  handleWebhook(@Req() req: RawBodyRequest<Request>) {
    return this.paymentsService.handleWebhook(req);
  }
}
