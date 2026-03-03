import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const correlationId = request.headers['x-correlation-id'] || uuidv4();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') { message = r; }
      else { const ro = r as Record<string, unknown>; message = (ro.message as string | string[]) || message; error = (ro.error as string) || error; }
    } else if (exception instanceof Error) { message = exception.message; }
    this.logger.error({ msg: 'HTTP Exception', status, correlationId, path: request.url });
    response.status(status).json({ statusCode: status, error, message, correlationId, timestamp: new Date().toISOString(), path: request.url });
  }
}
