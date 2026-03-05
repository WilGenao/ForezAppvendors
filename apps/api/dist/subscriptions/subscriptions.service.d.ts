import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
export declare class SubscriptionsService {
    private readonly dataSource;
    private readonly config;
    private readonly logger;
    private readonly stripe;
    constructor(dataSource: DataSource, config: ConfigService);
    getBuyerSubscriptions(userId: string): Promise<any>;
    cancelSubscription(userId: string, subscriptionId: string): Promise<{
        message: string;
    }>;
    reactivateSubscription(userId: string, subscriptionId: string): Promise<{
        message: string;
    }>;
    getBillingPortalUrl(userId: string): Promise<string>;
}
