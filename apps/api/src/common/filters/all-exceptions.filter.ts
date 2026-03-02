import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Request, Response } from 'express';
import { AppError } from '../errors/app.errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      errorCode = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        errorCode = 'HTTP_EXCEPTION';
        message = (body as any).message ?? exception.message;
        details = (body as any).errors;
      }
    }

    this.logger[statusCode >= 500 ? 'error' : 'warn']('Request error', {
      correlationId: (request as any).correlationId,
      method: request.method,
      path: request.path,
      statusCode, errorCode, message,
      ...(statusCode >= 500 && exception instanceof Error ? { stack: exception.stack } : {}),
    });

    response.status(statusCode).json({
      success: false,
      error: { code: errorCode, message, ...(details ? { details } : {}) },
      meta: { correlationId: (request as any).correlationId, timestamp: new Date().toISOString() },
    });
  }
}
