import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';

// Guard para API Keys de vendedores (EA Bridge).
// Separado del JwtAuthGuard porque tiene lógica distinta:
// - Rate limiting diferente (puede ser llamado cada tick)
// - Scopes diferentes (solo permisos de machine-to-machine)
// - Sin refresh token (key de larga duración)
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key requerida');
    }

    const requiredScopes = this.reflector.get<string[]>('api-scopes', context.getHandler()) || [];

    // Cache hit primero — evita query DB en cada validación de licencia
    const cacheKey = `apikey:${apiKey.substring(0, 8)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      const keyData = JSON.parse(cached);
      this.validateScopes(keyData.scopes, requiredScopes);
      request.apiKeyData = keyData;
      return true;
    }

    // Hash del key para comparar con DB — nunca guardamos el key raw
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const apiKeyRecord = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: { select: { id: true, status: true } } },
    });

    if (!apiKeyRecord || apiKeyRecord.revokedAt) {
      throw new UnauthorizedException('API key inválida o revocada');
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expirada');
    }

    if (apiKeyRecord.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Cuenta del usuario suspendida');
    }

    this.validateScopes(apiKeyRecord.scopes, requiredScopes);

    // Cache por 5 minutos
    await this.redis.set(cacheKey, JSON.stringify({
      userId: apiKeyRecord.userId,
      scopes: apiKeyRecord.scopes,
      keyId: apiKeyRecord.id,
    }), 300);

    // Actualizar last_used_at asíncronamente (no bloqueante)
    setImmediate(() => {
      this.prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      }).catch(console.error);
    });

    request.apiKeyData = { userId: apiKeyRecord.userId, scopes: apiKeyRecord.scopes };
    return true;
  }

  private validateScopes(userScopes: string[], requiredScopes: string[]): void {
    if (requiredScopes.length === 0) return;
    const hasScopes = requiredScopes.every((scope) => userScopes.includes(scope));
    if (!hasScopes) {
      throw new UnauthorizedException('Permisos insuficientes para este endpoint');
    }
  }
}
