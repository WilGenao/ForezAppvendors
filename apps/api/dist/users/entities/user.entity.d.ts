export declare class User {
    id: string;
    email: string;
    emailVerifiedAt: Date;
    passwordHash: string;
    totpSecret: string;
    totpEnabled: boolean;
    status: string;
    lastLoginAt: Date;
    lastLoginIp: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
    createdBy: string;
}
