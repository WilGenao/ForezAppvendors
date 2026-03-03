import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiKeyPayload } from '../common/decorators/api-key-user.decorator';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly config;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, config: ConfigService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto, ip: string): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    generate2FASecret(userId: string): Promise<{
        secret: string;
        qrCodeUrl: string;
    }>;
    enable2FA(userId: string, totpCode: string): Promise<{
        message: string;
    }>;
    refreshTokens(userId: string, _refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    validateApiKey(rawKey: string): Promise<ApiKeyPayload | null>;
    private generateTokenPair;
}
