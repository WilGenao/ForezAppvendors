import { DataSource } from 'typeorm';
import { SubmitKycDto } from './dto/submit-kyc.dto';
export declare class KycService {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    submit(userId: string, dto: SubmitKycDto): Promise<{
        id: any;
        status: string;
        message: string;
    }>;
    getStatus(userId: string): Promise<any>;
}
