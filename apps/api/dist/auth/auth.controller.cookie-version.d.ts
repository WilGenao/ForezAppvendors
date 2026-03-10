import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
export declare class AuthController {
    private readonly authService;
    private readonly config;
    constructor(authService: AuthService, config: ConfigService);
    register(dto: RegisterDto): Promise<{
        verifyToken: string;
        message: string;
    }>;
    login(dto: LoginDto, req: Request, res: Response): Promise<{
        message: string;
    }>;
    refresh(req: Request, res: Response): Promise<{
        message: string;
    }>;
    logout(user: JwtPayload, req: Request, res: Response): Promise<void>;
    me(user: JwtPayload): {
        sub: string;
        email: string;
        roles: string[];
    };
    setup2FA(user: JwtPayload): Promise<{
        secret: string;
        qrCodeUrl: string;
    }>;
    enable2FA(user: JwtPayload, dto: Enable2FADto): Promise<{
        message: string;
    }>;
}
