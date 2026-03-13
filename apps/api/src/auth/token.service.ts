import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  // ─── Generate Access + Refresh token pair ──────────────────────────────────
  async generateTokenPair(user: { id: string; email: string; role: string }) {
    const jti = randomUUID(); // unique token ID for blacklisting

    const basePayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      iss: this.configService.get('JWT_ISSUER', 'forexbot-api'),
      aud: this.configService.get('JWT_AUDIENCE', 'forexbot-client'),
      jti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(basePayload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(
        { ...basePayload, jti: randomUUID() }, // different jti for refresh
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    // Store refresh token reference in Redis (for rotation validation)
    await this.redis.setex(
      `jwt:refresh:${user.id}`,
      7 * 24 * 60 * 60, // 7 days in seconds
      jti,
    );

    return { accessToken, refreshToken };
  }

  // ─── Blacklist a token (logout) ────────────────────────────────────────────
  async blacklistToken(jti: string, expiresAt: number) {
    const ttl = expiresAt - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`jwt:blacklist:${jti}`, ttl, '1');
    }
  }

  // ─── Logout: blacklist access token ───────────────────────────────────────
  async logout(userId: string, jti: string, exp: number) {
    await Promise.all([
      this.blacklistToken(jti, exp),
      this.redis.del(`jwt:refresh:${userId}`), // invalidate refresh token
    ]);
  }

  // ─── Validate and rotate refresh token ────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        issuer: this.configService.get('JWT_ISSUER', 'forexbot-api'),
        audience: this.configService.get('JWT_AUDIENCE', 'forexbot-client'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token was already used (rotation)
    const blacklisted = await this.redis.get(`jwt:blacklist:${payload.jti}`);
    if (blacklisted) {
      // Possible token theft - invalidate all sessions for this user
      await this.redis.del(`jwt:refresh:${payload.sub}`);
      throw new UnauthorizedException('Refresh token already used. All sessions invalidated.');
    }

    // Blacklist old refresh token
    await this.blacklistToken(payload.jti, payload.exp);

    // Issue new token pair
    return this.generateTokenPair({
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    });
  }
}
