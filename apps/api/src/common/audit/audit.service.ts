import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogPayload {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Escritura asíncrona no-bloqueante: el request no espera al log.
  // Si el log falla, se captura el error pero NO se propaga.
  // Trade-off: posible pérdida de logs en crashes, aceptable para pre-seed.
  // En producción seria migrar a una cola durable.
  log(payload: AuditLogPayload): void {
    // setImmediate: ejecuta en la siguiente iteración del event loop,
    // después de que el response ya se envió al cliente.
    setImmediate(async () => {
      try {
        await this.prisma.auditLog.create({ data: payload });
      } catch (error) {
        // NO re-throw — el log nunca debe romper el flujo principal
        console.error('AuditLog write failed (non-fatal):', error);
      }
    });
  }
}
