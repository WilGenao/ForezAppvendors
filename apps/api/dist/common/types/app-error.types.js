"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.AppError = {
    INVALID_CREDENTIALS: 'Credenciales inválidas',
    USER_EMAIL_TAKEN: 'El email ya está registrado',
    USER_NOT_FOUND: 'Usuario no encontrado',
    USER_SUSPENDED: 'Cuenta suspendida',
    TOKEN_EXPIRED: 'Token expirado',
    TOKEN_INVALID: 'Token inválido',
    TOTP_INVALID: 'Código 2FA inválido',
    KYC_ALREADY_APPROVED: 'La verificación ya fue aprobada',
    KYC_PENDING_REVIEW: 'La verificación está en revisión',
    KYC_NOT_APPROVED: 'Debes completar la verificación de identidad',
    BOT_NOT_FOUND: 'Bot no encontrado',
    BOT_NOT_OWNED: 'No tienes permisos para modificar este bot',
    BOT_ALREADY_PUBLISHED: 'El bot ya está publicado',
    BOT_PENDING_REVIEW: 'El bot está en revisión',
    LISTING_NOT_FOUND: 'Listing no encontrado',
    LISTING_NOT_PUBLISHED: 'El listing no está disponible',
    SUBSCRIPTION_ALREADY_ACTIVE: 'Ya tienes una suscripción activa',
    SELLER_STRIPE_NOT_CONFIGURED: 'El vendedor no ha configurado pagos',
    LICENSE_NOT_FOUND: 'Licencia no encontrada',
    LICENSE_EXPIRED: 'Licencia expirada',
    LICENSE_REVOKED: 'Licencia revocada',
    FORBIDDEN: 'No tienes permisos para esta acción',
    RATE_LIMIT_EXCEEDED: 'Demasiadas solicitudes. Intenta más tarde.',
};
//# sourceMappingURL=app-error.types.js.map