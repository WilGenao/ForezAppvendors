import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ApiKeyPayload } from '../common/decorators/api-key-user.decorator';
export declare class UsersService {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    create(input: {
        email: string;
        passwordHash: string;
    }): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    updateLastLogin(id: string, ip: string): Promise<void>;
    storeTotpSecret(id: string, secret: string): Promise<void>;
    enableTotp(id: string): Promise<void>;
    findActiveApiKey(keyHash: string): Promise<ApiKeyPayload | null>;
}
