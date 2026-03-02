import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.headers['x-correlation-id'] || uuidv4();
    request.headers['x-correlation-id'] = correlationId;
    const start = Date.now();
    return next.handle().pipe(tap(() => {
      const resp = context.switchToHttp().getResponse();
      this.logger.log({ msg: 'HTTP Request', correlationId, method: request.method, url: request.url, statusCode: resp.statusCode, durationMs: Date.now() - start, ip: request.ip });
    }));
  }
}
