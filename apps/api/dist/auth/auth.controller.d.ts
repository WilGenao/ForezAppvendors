import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto, ip: string): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    refresh(_dto: RefreshTokenDto, req: Request & {
        user: JwtPayload & {
            refreshToken: string;
        };
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
    }>;
    setup2FA(user: JwtPayload): Promise<{
        secret: string;
        qrCodeUrl: string;
    }>;
    enable2FA(user: JwtPayload, dto: Enable2FADto): Promise<{
        message: string;
    }>;
}
