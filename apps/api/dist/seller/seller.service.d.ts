import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
export declare class SellerService {
    private readonly dataSource;
    private readonly config;
    private readonly logger;
    private readonly stripe;
    constructor(dataSource: DataSource, config: ConfigService);
    getDashboard(userId: string): Promise<{
        revenue: {
            totalCents: number;
            last30dCents: number;
            last7dCents: number;
            totalPayments: number;
            total: string;
            last30d: string;
        };
        activeSubscribers: any;
        bots: any;
        monthlySales: any;
        refunds: {
            count: number;
            totalCents: number;
            total: string;
        };
        stripe: {
            available: {
                amount: number;
                currency: string;
                display: string;
            }[];
            pending: {
                amount: number;
                currency: string;
                display: string;
            }[];
        };
    }>;
    getRecentSales(userId: string, page?: number, limit?: number): Promise<any>;
    getStripeOnboardingUrl(userId: string): Promise<{
        url: string;
    }>;
    getSellerProfile(userId: string): Promise<any>;
    private getRevenueStats;
    private getBotStats;
    private getMonthlySales;
    private getRefunds;
    private getStripeBalance;
}
