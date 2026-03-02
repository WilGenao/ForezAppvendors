import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({ jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), ignoreExpiration: false, secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'), passReqToCallback: true });
  }
  async validate(req: Request, payload: Record<string, unknown>) {
    const refreshToken = req.body?.refreshToken as string;
    if (!refreshToken) throw new UnauthorizedException();
    return { ...payload, refreshToken };
  }
}
