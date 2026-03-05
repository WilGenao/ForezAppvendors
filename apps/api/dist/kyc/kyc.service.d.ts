import { DataSource } from 'typeorm';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { UsersService } from '../users/users.service';
export declare class KycService {
    private readonly dataSource;
    private readonly usersService;
    private readonly logger;
    constructor(dataSource: DataSource, usersService: UsersService);
    submit(userId: string, dto: SubmitKycDto): Promise<{
        id: any;
        status: string;
        message: string;
    }>;
    getStatus(userId: string): Promise<any>;
    listPending(page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
    }>;
    approve(kycId: string, adminId: string): Promise<{
        message: string;
    }>;
    reject(kycId: string, adminId: string, reason: string): Promise<{
        message: string;
    }>;
}
