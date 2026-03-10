import { SellerService } from './seller.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class SellerController {
    private readonly sellerService;
    constructor(sellerService: SellerService);
    getDashboard(user: JwtPayload): Promise<{
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
    getRecentSales(user: JwtPayload, page?: number, limit?: number): Promise<any>;
    getStripeOnboarding(user: JwtPayload): Promise<{
        url: string;
    }>;
}
