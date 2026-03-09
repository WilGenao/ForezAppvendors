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

// Refresh tokens are stored as hashes in Redis with a TTL.
// Key format: refresh_token:{userId}:{tokenId} -> hash
const REFRESH_TOKEN_PREFIX = 'refresh_token';

// Email verification tokens stored in Redis with 24h TTL
const EMAIL_VERIFY_PREFIX = 'email_verify';
const EMAIL_VERIFY_TTL = 86400; // 24 hours

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

    // Generate and store email verification token
    const verifyToken = randomBytes(32).toString('hex');
    await this.redis.setex(
      `${EMAIL_VERIFY_PREFIX}:${verifyToken}`,
      EMAIL_VERIFY_TTL,
      user.id,
    );

    // TODO: Send verification email via your email provider
    // await this.mailService.sendVerificationEmail(user.email, verifyToken);
    this.logger.log({ msg: 'User registered — verification token generated', userId: user.id });

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      // In development, expose token for testing
      ...(this.config.get('NODE_ENV') !== 'production' && { verifyToken }),
    };
  }

  // FIX NEW: Email verification endpoint logic
  async verifyEmail(token: string) {
    const userId = await this.redis.get(`${EMAIL_VERIFY_PREFIX}:${token}`);
    if (!userId) {
      throw new BadRequestException('Verification token is invalid or has expired');
    }

    await this.usersService.markEmailVerified(userId);
    await this.redis.del(`${EMAIL_VERIFY_PREFIX}:${token}`);

    this.logger.log({ msg: 'Email verified', userId });
    return { message: 'Email verified successfully. You can now log in.' };
  }

  // FIX NEW: Password reset flow
  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const resetToken = randomBytes(32).toString('hex');
    await this.redis.setex(
      `password_reset:${resetToken}`,
      3600, // 1 hour TTL
      user.id,
    );

    // TODO: Send password reset email
    // await this.mailService.sendPasswordResetEmail(user.email, resetToken);
    this.logger.log({ msg: 'Password reset requested', userId: user.id });

    return {
      message: 'If that email exists, a reset link has been sent.',
      ...(this.config.get('NODE_ENV') !== 'production' && { resetToken }),
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redis.get(`password_reset:${token}`);
    if (!userId) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(userId, passwordHash);

    // Revoke all active sessions after password reset
    await this.revokeAllRefreshTokens(userId);
    await this.redis.del(`password_reset:${token}`);

    this.logger.log({ msg: 'Password reset successful', userId });
    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  async login(dto: LoginDto, ip: string) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    if (user.status !== 'active') {
      if (user.status === 'pending_verification') {
        throw new UnauthorizedException('Please verify your email before logging in');
      }
      throw new UnauthorizedException(`Account is ${user.status}`);
    }

    if (user.totpEnabled) {
      if (!dto.totpCode) throw new UnauthorizedException('2FA code required');
      const valid = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: dto.totpCode,
        window: 1,
      });
      if (!valid) throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.usersService.updateLastLogin(user.id, ip);
    const roles = await this.usersService.getUserRoles(user.id);
    return this.generateTokenPair(user.id, user.email, roles);
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
      secret: user.totpSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });
    if (!valid) throw new BadRequestException('Invalid TOTP code');
    await this.usersService.enableTotp(userId);
    return { message: '2FA enabled successfully' };
  }

  async disable2FA(userId: string, totpCode: string) {
    const user = await this.usersService.findById(userId);
    if (!user.totpEnabled) throw new BadRequestException('2FA is not enabled');
    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });
    if (!valid) throw new BadRequestException('Invalid TOTP code');
    await this.usersService.disableTotp(userId);
    return { message: '2FA disabled successfully' };
  }

  async refreshTokens(userId: string, incomingRefreshToken: string) {
    let payload: { sub: string; jti: string } | null = null;
    try {
      payload = this.jwtService.decode(incomingRefreshToken) as { sub: string; jti: string };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload?.jti || payload.sub !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify token signature using the refresh secret
    try {
      await this.jwtService.verifyAsync(incomingRefreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    // Check against stored hash in Redis
    const redisKey = `${REFRESH_TOKEN_PREFIX}:${userId}:${payload.jti}`;
    const storedHash = await this.redis.get(redisKey);
    if (!storedHash) {
      throw new UnauthorizedException('Refresh token has been revoked or expired');
    }

    const incomingHash = createHash('sha256').update(incomingRefreshToken).digest('hex');
    if (incomingHash !== storedHash) {
      // Possible token theft — invalidate ALL sessions for this user
      this.logger.warn({ msg: 'Refresh token hash mismatch — possible token theft', userId });
      await this.revokeAllRefreshTokens(userId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate: remove old token
    await this.redis.del(redisKey);

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    // FIX: Reload roles from DB — don't pass empty array
    const roles = await this.usersService.getUserRoles(userId);
    return this.generateTokenPair(user.id, user.email, roles);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.decode(refreshToken) as { jti?: string };
      if (payload?.jti) {
        await this.redis.del(`${REFRESH_TOKEN_PREFIX}:${userId}:${payload.jti}`);
      }
    } catch {
      // Silent — token may already be invalid
    }
  }

  async validateApiKey(rawKey: string): Promise<ApiKeyPayload | null> {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    return this.usersService.findActiveApiKey(keyHash);
  }

  // FIX NEW: Get all active sessions for a user
  async getActiveSessions(userId: string): Promise<{ sessionCount: number }> {
    const pattern = `${REFRESH_TOKEN_PREFIX}:${userId}:*`;
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, found] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== '0');
    return { sessionCount: keys.length };
  }

  // FIX NEW: Revoke all sessions (useful for "logout all devices")
  async revokeAllSessions(userId: string): Promise<{ message: string }> {
    await this.revokeAllRefreshTokens(userId);
    return { message: 'All sessions revoked successfully' };
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    const pattern = `${REFRESH_TOKEN_PREFIX}:${userId}:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  private async generateTokenPair(userId: string, email: string, roles: string[]) {
    const tokenId = randomBytes(32).toString('hex');
    const payload = { sub: userId, email, roles };
    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(
        { ...payload, jti: tokenId },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    const ttlSeconds = this.parseDurationToSeconds(refreshExpiresIn);
    const refreshHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.redis.setex(
      `${REFRESH_TOKEN_PREFIX}:${userId}:${tokenId}`,
      ttlSeconds,
      refreshHash,
    );

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }

  private parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 3600;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit];
  }
}
