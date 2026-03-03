import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(config.get<string>('STRIPE_SECRET_KEY', 'sk_test_placeholder'), { apiVersion: '2024-04-10' });
  }

  async createCheckoutSession(userId: string, botListingId: string, listingType: string) {
    return { message: 'Checkout session creation - configure Stripe keys to enable', userId, botListingId, listingType };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!rawBody || !signature) throw new BadRequestException('Invalid webhook');
    this.logger.log({ msg: 'Webhook received' });
  }
}
