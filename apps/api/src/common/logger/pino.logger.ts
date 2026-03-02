import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class PinoLogger implements LoggerService {
  private readonly logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: { service: 'forexbot-api' },
  });

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }
  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }
  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }
  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }
}
