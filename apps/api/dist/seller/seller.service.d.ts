import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
export declare class SellerService {
    private readonly dataSource;
    private readonly config;
    private readonly logger;
    private readonly stripe;
    constructor(dataSource: DataSource, config: ConfigService);
    getDashboard(userId: string): Promise<{
        seller: {
            displayName: any;
            isVerified: any;
            stripeConnected: boolean;
            stripeOnboardingUrl: string;
        };
        revenue: {
            totalCents: number;
            last30dCents: number;
            last7dCents: number;
            totalPayments: number;
            formatted: {
                total: string;
                last30d: string;
                last7d: string;
            };
        };
        stripeBalance: any;
        bots: any;
    }>;
    getRecentSales(userId: string, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
    }>;
    getStripeOnboardingUrl(userId: string, profile?: Record<string, unknown>): Promise<string>;
    private getSellerProfile;
}
