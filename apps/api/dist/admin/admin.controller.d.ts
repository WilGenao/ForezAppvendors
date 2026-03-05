import { AdminService } from './admin.service';
import { KycService } from '../kyc/kyc.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { ModerateBotsDto } from './dto/moderate-bot.dto';
export declare class AdminController {
    private readonly adminService;
    private readonly kycService;
    constructor(adminService: AdminService, kycService: KycService);
    getStats(): Promise<{
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
    listKyc(page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
    }>;
    approveKyc(id: string, admin: JwtPayload): Promise<{
        message: string;
    }>;
    rejectKyc(id: string, admin: JwtPayload, dto: ReviewKycDto): Promise<{
        message: string;
    }>;
    listBots(status?: string, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
    }>;
    approveBot(id: string, admin: JwtPayload): Promise<{
        message: string;
    }>;
    suspendBot(id: string, admin: JwtPayload, dto: ModerateBotsDto): Promise<{
        message: string;
    }>;
    rejectBot(id: string, admin: JwtPayload, dto: ModerateBotsDto): Promise<{
        message: string;
    }>;
    listUsers(search?: string, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
    }>;
    suspendUser(id: string, admin: JwtPayload): Promise<{
        message: string;
    }>;
    activateUser(id: string, admin: JwtPayload): Promise<{
        message: string;
    }>;
}
