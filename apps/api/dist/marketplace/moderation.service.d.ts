import { Repository, DataSource } from 'typeorm';
import { Bot } from './entities/bot.entity';
import { NotificationsService } from '../notifications/notifications.service';
export type BotModerationStatus = 'draft' | 'pending_review' | 'active' | 'suspended' | 'archived';
export declare class ModerationService {
    private readonly botRepo;
    private readonly dataSource;
    private readonly notificationsService;
    private readonly logger;
    constructor(botRepo: Repository<Bot>, dataSource: DataSource, notificationsService: NotificationsService);
    submitForReview(botId: string, userId: string, notes?: string): Promise<{
        success: boolean;
        status: string;
    }>;
    approveBat(botId: string, adminUserId: string, notes?: string): Promise<{
        success: boolean;
        status: string;
    }>;
    rejectBot(botId: string, adminUserId: string, reason: string): Promise<{
        success: boolean;
        status: string;
    }>;
    suspendBot(botId: string, adminUserId: string, reason: string): Promise<{
        success: boolean;
        status: string;
    }>;
    private findBotOwnedByUser;
    private getSellerUserId;
    private insertModerationEvent;
}
