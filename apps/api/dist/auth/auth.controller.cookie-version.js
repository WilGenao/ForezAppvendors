"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const enable_2fa_dto_1 = require("./dto/enable-2fa.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const config_1 = require("@nestjs/config");
let AuthController = class AuthController {
    constructor(authService, config) {
        this.authService = authService;
        this.config = config;
    }
    register(dto) {
        return this.authService.register(dto);
    }
    async login(dto, req, res) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
        const tokens = await this.authService.login(dto, ip);
        const isProd = this.config.get('NODE_ENV') === 'production';
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: 'strict',
        };
        res.cookie('access_token', tokens.accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000,
        });
        res.cookie('refresh_token', tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/v1/auth',
        });
        return { message: 'Login successful' };
    }
    async refresh(req, res) {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken) {
            res.status(common_1.HttpStatus.UNAUTHORIZED).json({ message: 'No refresh token' });
            return;
        }
        let userId;
        try {
            const decoded = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64url').toString());
            userId = decoded.sub;
        }
        catch {
            res.status(common_1.HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token format' });
            return;
        }
        const tokens = await this.authService.refreshTokens(userId, refreshToken);
        const isProd = this.config.get('NODE_ENV') === 'production';
        const cookieOptions = { httpOnly: true, secure: isProd, sameSite: 'strict' };
        res.cookie('access_token', tokens.accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000,
        });
        res.cookie('refresh_token', tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/v1/auth',
        });
        return { message: 'Token refreshed' };
    }
    async logout(user, req, res) {
        const refreshToken = req.cookies?.refresh_token;
        if (refreshToken) {
            await this.authService.logout(user.sub, refreshToken);
        }
        res.clearCookie('access_token');
        res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    }
    me(user) {
        return { sub: user.sub, email: user.email, roles: user.roles || [] };
    }
    setup2FA(user) {
        return this.authService.generate2FASecret(user.sub);
    }
    enable2FA(user, dto) {
        return this.authService.enable2FA(user.sub, dto.totpCode);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Login — sets httpOnly access_token and refresh_token cookies' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('2fa/setup'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "setup2FA", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('2fa/enable'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, enable_2fa_dto_1.Enable2FADto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "enable2FA", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)({ path: 'auth', version: '1' }),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.cookie-version.js.map