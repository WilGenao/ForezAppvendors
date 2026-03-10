export declare enum NotificationType {
    NEW_SALE = "NEW_SALE",
    BOT_APPROVED = "BOT_APPROVED",
    BOT_REJECTED = "BOT_REJECTED",
    NEW_REVIEW = "NEW_REVIEW",
    LICENSE_EXPIRING = "LICENSE_EXPIRING",
    SUBSCRIPTION_CANCELED = "SUBSCRIPTION_CANCELED",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    KYC_APPROVED = "KYC_APPROVED",
    KYC_REJECTED = "KYC_REJECTED"
}
export declare class Notification {
    id: string;
    userId: string;
    type: NotificationType;
    message: string;
    read: boolean;
    readAt: Date;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
