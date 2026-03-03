import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
export declare class PaymentsService {
    private readonly paymentRepo;
    private readonly config;
    private readonly logger;
    private readonly stripe;
    constructor(paymentRepo: Repository<Payment>, config: ConfigService);
    createCheckoutSession(userId: string, botListingId: string, listingType: string): Promise<{
        message: string;
        userId: string;
        botListingId: string;
        listingType: string;
    }>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<void>;
}
