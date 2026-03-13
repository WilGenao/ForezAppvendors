import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';

// Decorator to override rate limit per controller/route
export const THROTTLE_KEY = 'throttle_override';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP + user ID if authenticated, otherwise just IP
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.ip;

    const userId = req.user?.id;
    return userId ? `${ip}:${userId}` : ip;
  }

  protected throwThrottlingException(): Promise<void> {
    this.logger.warn('Rate limit exceeded');
    throw new ThrottlerException('Too many requests. Please slow down.');
  }
}
