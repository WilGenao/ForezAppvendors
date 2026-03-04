import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiKeyPayload } from '../common/decorators/api-key-user.decorator';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly config;
    private readonly redis;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, config: ConfigService, redis: Redis);
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
    refreshTokens(userId: string, incomingRefreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    logout(userId: string, refreshToken: string): Promise<void>;
    validateApiKey(rawKey: string): Promise<ApiKeyPayload | null>;
    private revokeAllRefreshTokens;
    private generateTokenPair;
    private parseDurationToSeconds;
}
