import { Controller, Post, Body, UseGuards, Req, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('checkout')
  createCheckout(@CurrentUser() user: JwtPayload, @Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckoutSession(
    user.sub,
    dto.botListingId,
    dto.listingType,
);
  }

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  stripeWebhook(@Req() req: Request & { rawBody: Buffer }, @Headers('stripe-signature') signature: string) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}
