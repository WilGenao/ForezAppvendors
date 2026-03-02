import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiKeyPayload } from '../common/decorators/api-key-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService, private readonly config: ConfigService) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({ email: dto.email, passwordHash });
    this.logger.log({ msg: 'User registered', userId: user.id });
    return { message: 'Registration successful. Please verify your email.' };
  }

  async login(dto: LoginDto, ip: string) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'active') throw new UnauthorizedException(`Account is ${user.status}`);
    if (user.totpEnabled) {
      if (!dto.totpCode) throw new UnauthorizedException('2FA code required');
      const valid = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: dto.totpCode, window: 1 });
      if (!valid) throw new UnauthorizedException('Invalid 2FA code');
    }
    await this.usersService.updateLastLogin(user.id, ip);
    return this.generateTokenPair(user.id, user.email, []);
  }

  async generate2FASecret(userId: string) {
    const secret = speakeasy.generateSecret({ name: `ForexBot:${userId}`, length: 32 });
    await this.usersService.storeTotpSecret(userId, secret.base32);
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCodeUrl };
  }

  async enable2FA(userId: string, totpCode: string) {
    const user = await this.usersService.findById(userId);
    if (!user.totpSecret) throw new BadRequestException('2FA setup not initiated');
    const valid = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: totpCode, window: 1 });
    if (!valid) throw new BadRequestException('Invalid TOTP code');
    await this.usersService.enableTotp(userId);
    return { message: '2FA enabled successfully' };
  }

  async refreshTokens(userId: string, _refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.generateTokenPair(user.id, user.email, []);
  }

  async validateApiKey(rawKey: string): Promise<ApiKeyPayload | null> {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    return this.usersService.findActiveApiKey(keyHash);
  }

  private async generateTokenPair(userId: string, email: string, roles: string[]) {
    const payload = { sub: userId, email, roles };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') }),
    ]);
    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }
}
