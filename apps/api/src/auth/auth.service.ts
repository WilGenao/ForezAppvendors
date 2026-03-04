import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { createHash, randomBytes } from 'crypto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiKeyPayload } from '../common/decorators/api-key-user.decorator';

const REFRESH_TOKEN_PREFIX = 'refresh_token';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

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
      const valid = speakeasy.totp.verify({
        secret: user.totpSecret, encoding: 'base32', token: dto.totpCode, window: 1,
      });
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
    const valid = speakeasy.totp.verify({
      secret: user.totpSecret, encoding: 'base32', token: totpCode, window: 1,
    });
    if (!valid) throw new BadRequestException('Invalid TOTP code');
    await this.usersService.enableTotp(userId);
    return { message: '2FA enabled successfully' };
  }

  // FIX: Valida hash del token contra Redis usando jti único por emisión
  async refreshTokens(userId: string, incomingRefreshToken: string) {
    let payload: { sub: string; jti: string } | null = null;
    try {
      payload = this.jwtService.decode(incomingRefreshToken) as { sub: string; jti: string };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!payload?.jti || payload.sub !== userId) throw new UnauthorizedException('Invalid refresh token');
    try {
      await this.jwtService.verifyAsync(incomingRefreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
    const redisKey = `${REFRESH_TOKEN_PREFIX}:${userId}:${payload.jti}`;
    const storedHash = await this.redis.get(redisKey);
    if (!storedHash) throw new UnauthorizedException('Refresh token has been revoked or expired');
    const incomingHash = createHash('sha256').update(incomingRefreshToken).digest('hex');
    if (incomingHash !== storedHash) {
      this.logger.warn({ msg: 'Refresh token hash mismatch — possible token theft', userId });
      await this.revokeAllRefreshTokens(userId);
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.redis.del(redisKey);
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.generateTokenPair(user.id, user.email, []);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.decode(refreshToken) as { jti?: string };
      if (payload?.jti) await this.redis.del(`${REFRESH_TOKEN_PREFIX}:${userId}:${payload.jti}`);
    } catch { /* silent */ }
  }

  async validateApiKey(rawKey: string): Promise<ApiKeyPayload | null> {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    return this.usersService.findActiveApiKey(keyHash);
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    const pattern = `${REFRESH_TOKEN_PREFIX}:${userId}:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await this.redis.del(...keys);
    } while (cursor !== '0');
  }

  private async generateTokenPair(userId: string, email: string, roles: string[]) {
    const tokenId = randomBytes(32).toString('hex');
    const payload = { sub: userId, email, roles };
    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync({ ...payload, jti: tokenId }, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      }),
    ]);
    const ttlSeconds = this.parseDurationToSeconds(refreshExpiresIn);
    const refreshHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.redis.setex(`${REFRESH_TOKEN_PREFIX}:${userId}:${tokenId}`, ttlSeconds, refreshHash);
    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }

  private parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 3600;
    const value = parseInt(match[1], 10);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[match[2]];
  }
}
