export declare class Payment {
    id: string;
    subscriptionId: string;
    userId: string;
    status: string;
    amountCents: number;
    currency: string;
    platformFeeCents: number;
    sellerPayoutCents: number;
    stripePaymentIntentId: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
