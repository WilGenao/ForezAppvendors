// apps/api/src/marketplace/moderation.service.ts
// Handles the bot moderation lifecycle: draft → pending_review → approved | rejected
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bot } from './entities/bot.entity';
import { NotificationsService } from '../notifications/notifications.service';

export type BotModerationStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'suspended'
  | 'archived';

const VALID_TRANSITIONS: Record<BotModerationStatus, BotModerationStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['active', 'draft'], // active = approved, draft = rejected (back to seller)
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(Bot)
    private readonly botRepo: Repository<Bot>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Seller submits a bot for moderation review.
   * Only allowed from 'draft' status.
   */
  async submitForReview(
    botId: string,
    userId: string,
    notes?: string,
  ): Promise<{ success: boolean; status: string }> {
    const bot = await this.findBotOwnedByUser(botId, userId);

    if (bot.status !== 'draft') {
      throw new BadRequestException(
        `Bot cannot be submitted from status '${bot.status}'. Must be in 'draft'.`,
      );
    }

    // Ensure at least one listing exists
    const [listing] = await this.dataSource.query(
      `SELECT id FROM bot_listings WHERE bot_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [botId],
    );
    if (!listing) {
      throw new BadRequestException('You must create a listing before submitting for review');
    }

    await this.botRepo.update(botId, { status: 'pending_review' });

    // Record moderation event
    await this.insertModerationEvent(botId, userId, 'submitted', notes);

    this.logger.log({ msg: 'Bot submitted for review', botId, userId });
    return { success: true, status: 'pending_review' };
  }

  /**
   * Admin approves a bot — sets status to 'active' and publishes all draft listings.
   */
  async approveBat(
    botId: string,
    adminUserId: string,
    notes?: string,
  ): Promise<{ success: boolean; status: string }> {
    const bot = await this.botRepo.findOne({ where: { id: botId } });
    if (!bot) throw new NotFoundException('Bot not found');

    if (bot.status !== 'pending_review') {
      throw new BadRequestException(
        `Bot must be in 'pending_review' to approve. Current status: '${bot.status}'`,
      );
    }

    // Activate bot and publish its listings in one transaction
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Bot, botId, {
        status: 'active',
        isVerified: true,
        verifiedAt: new Date(),
      });

      // Auto-publish draft listings that belong to this bot
      await manager.query(
        `UPDATE bot_listings SET status = 'published'
         WHERE bot_id = $1 AND status = 'draft' AND deleted_at IS NULL`,
        [botId],
      );
    });

    await this.insertModerationEvent(botId, adminUserId, 'approved', notes);

    // Notify seller
    const sellerUserId = await this.getSellerUserId(bot.sellerId);
    if (sellerUserId) {
      await this.notificationsService.notifyBotApproved(sellerUserId, bot.name, botId);
    }

    this.logger.log({ msg: 'Bot approved', botId, adminUserId });
    return { success: true, status: 'active' };
  }

  /**
   * Admin rejects a bot — sends it back to 'draft' with a reason.
   */
  async rejectBot(
    botId: string,
    adminUserId: string,
    reason: string,
  ): Promise<{ success: boolean; status: string }> {
    const bot = await this.botRepo.findOne({ where: { id: botId } });
    if (!bot) throw new NotFoundException('Bot not found');

    if (bot.status !== 'pending_review') {
      throw new BadRequestException(
        `Bot must be in 'pending_review' to reject. Current status: '${bot.status}'`,
      );
    }

    await this.botRepo.update(botId, { status: 'draft' });
    await this.insertModerationEvent(botId, adminUserId, 'rejected', reason);

    // Notify seller
    const sellerUserId = await this.getSellerUserId(bot.sellerId);
    if (sellerUserId) {
      await this.notificationsService.notifyBotRejected(sellerUserId, bot.name, botId, reason);
    }

    this.logger.log({ msg: 'Bot rejected', botId, adminUserId, reason });
    return { success: true, status: 'draft' };
  }

  /**
   * Admin suspends a live bot (e.g. policy violation).
   */
  async suspendBot(
    botId: string,
    adminUserId: string,
    reason: string,
  ): Promise<{ success: boolean; status: string }> {
    const bot = await this.botRepo.findOne({ where: { id: botId } });
    if (!bot) throw new NotFoundException('Bot not found');

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Bot, botId, { status: 'suspended' });
      // Unpublish listings
      await manager.query(
        `UPDATE bot_listings SET status = 'unpublished' WHERE bot_id = $1 AND deleted_at IS NULL`,
        [botId],
      );
    });

    await this.insertModerationEvent(botId, adminUserId, 'suspended', reason);

    this.logger.log({ msg: 'Bot suspended', botId, adminUserId, reason });
    return { success: true, status: 'suspended' };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async findBotOwnedByUser(botId: string, userId: string): Promise<Bot> {
    const [bot] = await this.dataSource.query(
      `SELECT b.* FROM bots b
       JOIN seller_profiles sp ON sp.id = b.seller_id
       WHERE b.id = $1 AND sp.user_id = $2 AND b.deleted_at IS NULL
       LIMIT 1`,
      [botId, userId],
    );
    if (!bot) throw new NotFoundException('Bot not found or not owned by you');
    return bot;
  }

  private async getSellerUserId(sellerId: string): Promise<string | null> {
    const [sp] = await this.dataSource.query(
      `SELECT user_id FROM seller_profiles WHERE id = $1 LIMIT 1`,
      [sellerId],
    );
    return sp?.user_id ?? null;
  }

  private async insertModerationEvent(
    botId: string,
    actorId: string,
    action: string,
    notes?: string,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO bot_moderation_events (bot_id, actor_id, action, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [botId, actorId, action, notes ?? null],
    ).catch(() => {
      // Table may not exist in all environments — non-fatal
    });
  }
}
