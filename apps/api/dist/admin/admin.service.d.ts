import { DataSource } from 'typeorm';
export declare class AdminService {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    getPlatformStats(): Promise<{
        users: {
            total: number;
            active: number;
            newLast7d: number;
        };
        bots: {
            total: number;
            active: number;
            pendingReview: number;
        };
        kyc: {
            pending: number;
            underReview: number;
            totalQueued: number;
        };
        subscriptions: {
            active: number;
        };
        revenue: {
            last30dCents: number;
            platformFeeLast30dCents: number;
            last30dFormatted: string;
            platformFeeFormatted: string;
        };
        anomalies: {
            open: number;
        };
    }>;
    listBotsForReview(status?: string, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
    }>;
    updateBotStatus(botId: string, newStatus: string, adminId: string, reason?: string): Promise<{
        message: string;
    }>;
    listUsers(search?: string, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
    }>;
    setUserStatus(userId: string, status: string, adminId: string): Promise<{
        message: string;
    }>;
}
