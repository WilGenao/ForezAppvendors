// apps/api/src/notifications/notifications.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  message: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  /**
   * Create a notification for a user.
   * Called internally by other services (PaymentsService, ReviewsService, etc.)
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: dto.userId,
      type: dto.type,
      message: dto.message,
      metadata: dto.metadata,
      read: false,
    });
    const saved = await this.notificationRepo.save(notification);
    this.logger.log({
      msg: 'Notification created',
      userId: dto.userId,
      type: dto.type,
    });
    return saved;
  }

  /**
   * List all notifications for the current user.
   * Returns unread first, then read, sorted by creation date.
   */
  async listForUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    pages: number;
  }> {
    const offset = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationRepo.find({
        where: { userId },
        order: { read: 'ASC', createdAt: 'DESC' },
        take: limit,
        skip: offset,
      }),
      this.notificationRepo.count({ where: { userId } }),
      this.notificationRepo.count({ where: { userId, read: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark a single notification as read.
   * Validates ownership before updating.
   */
  async markRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('Access denied');

    if (!notification.read) {
      await this.notificationRepo.update(notificationId, {
        read: true,
        readAt: new Date(),
      });
    }

    return { success: true };
  }

  /**
   * Mark ALL notifications for a user as read.
   */
  async markAllRead(userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepo.update(
      { userId, read: false },
      { read: true, readAt: new Date() },
    );
    return { count: result.affected ?? 0 };
  }

  /**
   * Convenience method: send a BOT_APPROVED notification to a seller.
   */
  async notifyBotApproved(sellerUserId: string, botName: string, botId: string): Promise<void> {
    await this.create({
      userId: sellerUserId,
      type: NotificationType.BOT_APPROVED,
      message: `Your bot "${botName}" has been approved and is now live on the marketplace.`,
      metadata: { botId },
    });
  }

  /**
   * Convenience method: send a BOT_REJECTED notification to a seller.
   */
  async notifyBotRejected(
    sellerUserId: string,
    botName: string,
    botId: string,
    reason?: string,
  ): Promise<void> {
    await this.create({
      userId: sellerUserId,
      type: NotificationType.BOT_REJECTED,
      message: `Your bot "${botName}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
      metadata: { botId, reason },
    });
  }

  /**
   * Convenience method: send a NEW_SALE notification to a seller.
   */
  async notifyNewSale(
    sellerUserId: string,
    botName: string,
    botId: string,
    amountCents: number,
  ): Promise<void> {
    await this.create({
      userId: sellerUserId,
      type: NotificationType.NEW_SALE,
      message: `New sale! "${botName}" was purchased for $${(amountCents / 100).toFixed(2)}.`,
      metadata: { botId, amountCents },
    });
  }

  /**
   * Convenience method: license expiring warning.
   */
  async notifyLicenseExpiring(
    userId: string,
    botName: string,
    licenseId: string,
    daysLeft: number,
  ): Promise<void> {
    await this.create({
      userId,
      type: NotificationType.LICENSE_EXPIRING,
      message: `Your license for "${botName}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew to keep access.`,
      metadata: { licenseId, daysLeft },
    });
  }
}
