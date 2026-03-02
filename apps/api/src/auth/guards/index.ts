// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    const hasRole = requiredRoles.some(role => user.roles?.includes(role as any));
    if (!hasRole) {
      throw new ForbiddenException(`Requiere uno de estos roles: ${requiredRoles.join(', ')}`);
    }
    return true;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// src/auth/guards/api-key.guard.ts
// Usado por el EA de MT4/5. Diferente de JWT: no tiene roles, solo scopes.
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('API key requerida');
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Buscar en caché primero (TTL 5 minutos)
    const cacheKey = `api_key:${keyHash}`;
    const cached = await this.redis.get(cacheKey);

    let apiKeyRecord;
    if (cached) {
      apiKeyRecord = JSON.parse(cached);
    } else {
      apiKeyRecord = await this.prisma.apiKey.findFirst({
        where: {
          keyHash,
          deletedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: { user: { select: { id: true, status: true } } },
      });

      if (apiKeyRecord) {
        await this.redis.setex(cacheKey, 300, JSON.stringify(apiKeyRecord));
      }
    }

    if (!apiKeyRecord) {
      throw new UnauthorizedException('API key inválida');
    }

    if (apiKeyRecord.user?.status === 'suspended' || apiKeyRecord.user?.status === 'banned') {
      throw new UnauthorizedException('Cuenta suspendida');
    }

    // Actualizar lastUsedAt de forma asíncrona (no bloquear la request)
    this.prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: request.ip,
        usageCount: { increment: 1 },
      },
    }).catch(() => {}); // fire and forget

    // Adjuntar info de la API key al request
    request.apiKey = apiKeyRecord;
    request.apiKeyUserId = apiKeyRecord.userId;
    return true;
  }
}
