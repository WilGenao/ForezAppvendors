import { LicensingService } from './licensing.service';
import { ValidateLicenseDto } from './dto/validate-license.dto';
import { RevokeLicenseDto } from './dto/revoke-license.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class LicensingController {
    private readonly licensingService;
    constructor(licensingService: LicensingService);
    validate(dto: ValidateLicenseDto, ip: string): Promise<import("./licensing.service").ValidationResult>;
    getMyLicenses(user: JwtPayload): Promise<unknown[]>;
    revoke(user: JwtPayload, licenseId: string, dto: RevokeLicenseDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
