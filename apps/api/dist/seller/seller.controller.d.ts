import { SellerService } from './seller.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class SellerController {
    private readonly sellerService;
    constructor(sellerService: SellerService);
    getDashboard(user: JwtPayload): Promise<{
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
    getRecentSales(user: JwtPayload, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
    }>;
    getStripeOnboarding(user: JwtPayload): Promise<string>;
}
