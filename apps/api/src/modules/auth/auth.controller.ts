import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { JwtAuthGuard, Public } from './guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public() @Post('register')
  @Throttle({ medium: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register new user' })
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Public() @Post('login') @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login and get tokens' })
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Public() @Post('refresh') @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto) { return this.authService.refreshTokens(dto.refreshToken); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post('2fa/setup')
  setup2FA(@CurrentUser() user: CurrentUserPayload) { return this.authService.setup2FA(user.sub); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post('2fa/enable')
  enable2FA(@CurrentUser() user: CurrentUserPayload, @Body('token') token: string) {
    return this.authService.enable2FA(user.sub, token);
  }
}
