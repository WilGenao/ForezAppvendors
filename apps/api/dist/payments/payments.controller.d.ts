import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createCheckout(user: JwtPayload, dto: CreateCheckoutDto): Promise<{
        message: string;
        userId: string;
        botListingId: string;
        listingType: string;
    }>;
    stripeWebhook(req: Request & {
        rawBody: Buffer;
    }, signature: string): Promise<void>;
}
