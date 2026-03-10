import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { LicensingService } from '../licensing/licensing.service';
export declare class PaymentsService {
    private readonly paymentRepo;
    private readonly config;
    private readonly dataSource;
    private readonly licensingService;
    private readonly logger;
    private readonly stripe;
    constructor(paymentRepo: Repository<Payment>, config: ConfigService, dataSource: DataSource, licensingService: LicensingService);
    createCheckoutSession(userId: string, botListingId: string, listingType: string): Promise<{
        checkoutUrl: string;
        sessionId: string;
    }>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<void>;
    private markEventProcessed;
    private handleCheckoutCompleted;
    private handleInvoicePaid;
    private handleSubscriptionCancelled;
    private handlePaymentFailed;
    private handleSubscriptionUpdated;
    getUserPaymentHistory(userId: string): Promise<any>;
}
