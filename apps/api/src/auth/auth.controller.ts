import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    return this.authService.login(dto, ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a valid refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    // FIX: userId is now extracted from the token itself inside the service.
    // We decode it before verifying so we can look up the stored hash.
    let userId: string;
    try {
      // Decode without verification to get sub — full validation happens in service
      const decoded = JSON.parse(
        Buffer.from(dto.refreshToken.split('.')[1], 'base64url').toString(),
      );
      userId = decoded.sub;
    } catch {
      throw new Error('Invalid token format');
    }
    return this.authService.refreshTokens(userId, dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout — revoke the provided refresh token' })
  async logout(@CurrentUser() user: JwtPayload, @Body() dto: RefreshTokenDto) {
    await this.authService.logout(user.sub, dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('2fa/setup')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  setup2FA(@CurrentUser() user: JwtPayload) {
    return this.authService.generate2FASecret(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/enable')
  @ApiOperation({ summary: 'Enable 2FA after verifying TOTP code' })
  enable2FA(@CurrentUser() user: JwtPayload, @Body() dto: Enable2FADto) {
    return this.authService.enable2FA(user.sub, dto.totpCode);
  }
}
