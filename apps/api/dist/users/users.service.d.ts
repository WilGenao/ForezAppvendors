import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { ApiKeyPayload } from '../common/decorators/api-key-user.decorator';
import { AppRole } from '../common/decorators/roles.decorator';
export declare class UsersService {
    private readonly userRepo;
    private readonly dataSource;
    constructor(userRepo: Repository<User>, dataSource: DataSource);
    create(input: {
        email: string;
        passwordHash: string;
    }): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    updateLastLogin(id: string, ip: string): Promise<void>;
    storeTotpSecret(id: string, secret: string): Promise<void>;
    enableTotp(id: string): Promise<void>;
    disableTotp(id: string): Promise<void>;
    markEmailVerified(id: string): Promise<void>;
    updatePassword(id: string, passwordHash: string): Promise<void>;
    getRolesForUser(userId: string): Promise<AppRole[]>;
    getUserRoles(userId: string): Promise<string[]>;
    assignRole(userId: string, role: AppRole, grantedBy?: string, expiresAt?: Date): Promise<void>;
    revokeRole(userId: string, role: AppRole): Promise<void>;
    findActiveApiKey(keyHash: string): Promise<ApiKeyPayload | null>;
    getUserProfile(userId: string): Promise<any>;
}
