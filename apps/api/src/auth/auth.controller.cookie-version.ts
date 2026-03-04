import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login — sets httpOnly access_token and refresh_token cookies' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const tokens = await this.authService.login(dto, ip);

    const isProd = this.config.get('NODE_ENV') === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,      // HTTPS only in production
      sameSite: 'strict' as const,
    };

    // FIX: Tokens are set as httpOnly cookies, never returned in JSON body.
    res.cookie('access_token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth', // Restrict refresh token cookie to auth paths only
    });

    return { message: 'Login successful' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No refresh token' });
      return;
    }

    // Decode to extract userId (full validation happens inside refreshTokens)
    let userId: string;
    try {
      const decoded = JSON.parse(
        Buffer.from(refreshToken.split('.')[1], 'base64url').toString(),
      );
      userId = decoded.sub;
    } catch {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token format' });
      return;
    }

    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    const isProd = this.config.get('NODE_ENV') === 'production';
    const cookieOptions = { httpOnly: true, secure: isProd, sameSite: 'strict' as const };

    res.cookie('access_token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return { message: 'Token refreshed' };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(user.sub, refreshToken);
    }
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
  }

  // FIX: /auth/me is used by the frontend useAuth hook instead of decoding JWT from localStorage.
  // This is safe because the access_token cookie is validated server-side by JwtStrategy.
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return { sub: user.sub, email: user.email, roles: user.roles || [] };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('2fa/setup')
  setup2FA(@CurrentUser() user: JwtPayload) {
    return this.authService.generate2FASecret(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/enable')
  enable2FA(@CurrentUser() user: JwtPayload, @Body() dto: Enable2FADto) {
    return this.authService.enable2FA(user.sub, dto.totpCode);
  }
}
