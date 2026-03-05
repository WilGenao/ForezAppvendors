import { SubscriptionsService } from './subscriptions.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    getMySubscriptions(user: JwtPayload): Promise<any>;
    cancel(user: JwtPayload, id: string): Promise<{
        message: string;
    }>;
    reactivate(user: JwtPayload, id: string): Promise<{
        message: string;
    }>;
    billingPortal(user: JwtPayload): Promise<string>;
}
