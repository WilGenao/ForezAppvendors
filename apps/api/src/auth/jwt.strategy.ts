import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: string;       // user UUID
  email: string;
  role: string;
  iss: string;       // issuer
  aud: string;       // audience
  jti: string;       // unique token ID (for blacklist)
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
      // Validate issuer and audience for extra security
      issuer: configService.get<string>('JWT_ISSUER', 'forexbot-api'),
      audience: configService.get<string>('JWT_AUDIENCE', 'forexbot-client'),
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    // 1. Check JWT blacklist in Redis (for logged-out tokens)
    const blacklisted = await this.redis.get(`jwt:blacklist:${payload.jti}`);
    if (blacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // 2. Validate user still exists and is active
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
  }
}
