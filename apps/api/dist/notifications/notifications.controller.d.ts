import { NotificationsService } from './notifications.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
declare class NotificationsQueryDto {
    page?: number;
    limit?: number;
}
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    list(user: JwtPayload, query: NotificationsQueryDto): Promise<{
        notifications: import("./entities/notification.entity").Notification[];
        total: number;
        unreadCount: number;
        page: number;
        pages: number;
    }>;
    markRead(user: JwtPayload, id: string): Promise<{
        success: boolean;
    }>;
    markAllRead(user: JwtPayload): Promise<{
        count: number;
    }>;
}
export {};
