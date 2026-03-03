import { Repository, DataSource } from 'typeorm';
import Redis from 'ioredis';
import { License } from './entities/license.entity';
import { ValidateLicenseDto } from './dto/validate-license.dto';
export declare enum LicenseValidationCode {
    VALID = "VALID",
    INVALID_KEY = "INVALID_KEY",
    EXPIRED = "EXPIRED",
    REVOKED = "REVOKED",
    HWID_MISMATCH = "HWID_MISMATCH",
    MAX_ACTIVATIONS = "MAX_ACTIVATIONS"
}
export interface ValidationResult {
    isValid: boolean;
    code: LicenseValidationCode;
    message: string;
    expiresAt?: Date;
    botId?: string;
    botVersionId?: string;
}
export declare class LicensingService {
    private readonly licenseRepo;
    private readonly redis;
    private readonly dataSource;
    private readonly logger;
    private readonly CACHE_TTL_SECONDS;
    private readonly RATE_LIMIT_WINDOW_SECONDS;
    private readonly MAX_VALIDATIONS_PER_MINUTE;
    constructor(licenseRepo: Repository<License>, redis: Redis, dataSource: DataSource);
    validate(dto: ValidateLicenseDto, ip: string): Promise<ValidationResult>;
    private evaluateLicense;
    private getCachedValidation;
    private cacheValidation;
    private logValidationAsync;
    private registerHwidAsync;
    generateLicenseKey(subscriptionId: string, userId: string, botId: string, botVersionId: string): Promise<License>;
    revokeLicense(licenseId: string, reason: string): Promise<void>;
}
