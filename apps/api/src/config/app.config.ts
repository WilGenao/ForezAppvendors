import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  analyticsEngineUrl: process.env.ANALYTICS_ENGINE_URL ?? 'http://analytics:8000',
  platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT ?? '15'),
}));
