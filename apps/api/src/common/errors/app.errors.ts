// Errores tipados — NUNCA throw new Error('string')
// Cada error tiene un código de dominio, un mensaje para el usuario,
// y un status HTTP. Esto permite al filtro global manejarlos de forma uniforme.

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      'RESOURCE_NOT_FOUND',
      id ? `${resource} con id '${id}' no encontrado` : `${resource} no encontrado`,
      404,
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(reason = 'No autorizado') {
    super('UNAUTHORIZED', reason, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(reason = 'Acceso denegado') {
    super('FORBIDDEN', reason, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details?: unknown) {
    super('PAYMENT_ERROR', message, 402, details);
  }
}

export class LicenseError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 403);
  }
}
