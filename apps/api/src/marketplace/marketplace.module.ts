// apps/api/src/marketplace/marketplace.module.ts
// MODIFIED — added ModerationService + ModerationController + AdminModerationController
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { ModerationController, AdminModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { Bot } from './entities/bot.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bot]),
    NotificationsModule,
  ],
  controllers: [
    MarketplaceController,
    ModerationController,
    AdminModerationController,
  ],
  providers: [MarketplaceService, ModerationService],
  exports: [MarketplaceService, ModerationService],
})
export class MarketplaceModule {}
