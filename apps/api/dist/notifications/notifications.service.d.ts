import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
export interface CreateNotificationDto {
    userId: string;
    type: NotificationType;
    message: string;
    metadata?: Record<string, unknown>;
}
export declare class NotificationsService {
    private readonly notificationRepo;
    private readonly logger;
    constructor(notificationRepo: Repository<Notification>);
    create(dto: CreateNotificationDto): Promise<Notification>;
    listForUser(userId: string, page?: number, limit?: number): Promise<{
        notifications: Notification[];
        total: number;
        unreadCount: number;
        page: number;
        pages: number;
    }>;
    markRead(notificationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    markAllRead(userId: string): Promise<{
        count: number;
    }>;
    notifyBotApproved(sellerUserId: string, botName: string, botId: string): Promise<void>;
    notifyBotRejected(sellerUserId: string, botName: string, botId: string, reason?: string): Promise<void>;
    notifyNewSale(sellerUserId: string, botName: string, botId: string, amountCents: number): Promise<void>;
    notifyLicenseExpiring(userId: string, botName: string, licenseId: string, daysLeft: number): Promise<void>;
}
