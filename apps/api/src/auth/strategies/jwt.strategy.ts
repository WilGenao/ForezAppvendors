// apps/api/src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; roles: string[] }) { console.log("JWT validate called", payload.sub); console.log("JWT validate called", payload.sub);
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== 'active') throw new UnauthorizedException();

    // FIX: Roles are loaded fresh from DB on each request.
    // This ensures revoked roles take effect immediately without waiting for JWT expiry.
    const roles = await this.usersService.getRolesForUser(payload.sub);

    console.log("JWT roles for user:", payload.sub, roles); return { sub: payload.sub, email: payload.email, roles };
  }
}




