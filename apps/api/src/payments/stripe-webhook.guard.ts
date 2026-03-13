import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Request } from 'express';

// Official Stripe IP ranges (update periodically from https://stripe.com/docs/ips)
// Last updated: 2025
const STRIPE_WEBHOOK_IPS = [
  '3.18.12.63',
  '3.130.192.231',
  '13.235.14.237',
  '13.235.122.149',
  '18.211.135.69',
  '35.154.171.200',
  '52.15.183.38',
  '54.187.174.169',
  '54.187.205.235',
  '54.187.216.72',
  '54.241.31.99',
  '54.241.31.102',
  '54.241.34.107',
];

@Injectable()
export class StripeWebhookGuard implements CanActivate {
  private readonly logger = new Logger(StripeWebhookGuard.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly isDev: boolean;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(configService.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-04-10',
    });
    this.webhookSecret = configService.get<string>('STRIPE_WEBHOOK_SECRET');
    this.isDev = configService.get('NODE_ENV') === 'development';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // ─── 1. IP Whitelist (skip in development) ─────────────────────────────
    if (!this.isDev) {
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress;

      if (!STRIPE_WEBHOOK_IPS.includes(clientIp)) {
        this.logger.warn(`Stripe webhook blocked from unauthorized IP: ${clientIp}`);
        throw new ForbiddenException('Unauthorized webhook source');
      }
    }

    // ─── 2. Signature Verification ─────────────────────────────────────────
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    // Raw body required for signature verification
    // Make sure body-parser is configured to expose rawBody on webhook route
    const rawBody: Buffer = (req as any).rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body not available for webhook verification');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
        // 5 minute tolerance (300 seconds) for timestamp validation
        300,
      );

      // Attach the verified event to the request for use in the controller
      (req as any).stripeEvent = event;
      return true;
    } catch (err) {
      this.logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook verification failed: ${err.message}`);
    }
  }
}
