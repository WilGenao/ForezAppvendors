import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus, Get, Ip } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Ip() ip: string) { return this.authService.login(dto, ip); }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  refresh(@Body() _dto: RefreshTokenDto, @Req() req: Request & { user: JwtPayload & { refreshToken: string } }) {
    return this.authService.refreshTokens(req.user.sub, req.user.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('2fa/setup')
  setup2FA(@CurrentUser() user: JwtPayload) { return this.authService.generate2FASecret(user.sub); }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/enable')
  enable2FA(@CurrentUser() user: JwtPayload, @Body() dto: Enable2FADto) { return this.authService.enable2FA(user.sub, dto.totpCode); }
}
