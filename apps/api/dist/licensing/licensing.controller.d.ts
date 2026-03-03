import { LicensingService } from './licensing.service';
import { ValidateLicenseDto } from './dto/validate-license.dto';
export declare class LicensingController {
    private readonly licensingService;
    constructor(licensingService: LicensingService);
    validate(dto: ValidateLicenseDto, ip: string): Promise<import("./licensing.service").ValidationResult>;
}
