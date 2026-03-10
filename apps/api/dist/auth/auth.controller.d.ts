import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
declare class VerifyEmailDto {
    token: string;
}
declare class RequestResetDto {
    email: string;
}
declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        verifyToken: string;
        message: string;
    }>;
    login(dto: LoginDto, req: Request): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    logout(user: JwtPayload, dto: RefreshTokenDto): Promise<void>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: RequestResetDto): Promise<{
        message: string;
    } | {
        resetToken: string;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    getSessions(user: JwtPayload): Promise<{
        sessionCount: number;
    }>;
    revokeAllSessions(user: JwtPayload): Promise<{
        message: string;
    }>;
    setup2FA(user: JwtPayload): Promise<{
        secret: string;
        qrCodeUrl: string;
    }>;
    enable2FA(user: JwtPayload, dto: Enable2FADto): Promise<{
        message: string;
    }>;
    disable2FA(user: JwtPayload, dto: Enable2FADto): Promise<{
        message: string;
    }>;
}
export {};
