// apps/api/src/notifications/entities/notification.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  NEW_SALE = 'NEW_SALE',
  BOT_APPROVED = 'BOT_APPROVED',
  BOT_REJECTED = 'BOT_REJECTED',
  NEW_REVIEW = 'NEW_REVIEW',
  LICENSE_EXPIRING = 'LICENSE_EXPIRING',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
}

@Entity('notifications')
@Index('idx_notifications_user_id', ['userId'])
@Index('idx_notifications_user_read', ['userId', 'read'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  read: boolean;

  @Column({ name: 'read_at', nullable: true })
  readAt: Date;

  /**
   * Optional structured metadata (botId, reviewId, etc.)
   * Stored as JSONB for flexibility.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
