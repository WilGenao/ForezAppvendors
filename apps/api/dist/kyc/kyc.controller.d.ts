import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class KycController {
    private readonly kycService;
    constructor(kycService: KycService);
    submit(user: JwtPayload, dto: SubmitKycDto): Promise<{
        id: any;
        status: string;
        message: string;
    }>;
    getStatus(user: JwtPayload): Promise<any>;
}
