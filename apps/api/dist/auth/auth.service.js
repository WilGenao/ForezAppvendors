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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const crypto_1 = require("crypto");
const users_service_1 = require("../users/users.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService, config) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = await this.usersService.create({ email: dto.email, passwordHash });
        this.logger.log({ msg: 'User registered', userId: user.id });
        return { message: 'Registration successful. Please verify your email.' };
    }
    async login(dto, ip) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (user.status !== 'active')
            throw new common_1.UnauthorizedException(`Account is ${user.status}`);
        if (user.totpEnabled) {
            if (!dto.totpCode)
                throw new common_1.UnauthorizedException('2FA code required');
            const valid = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: dto.totpCode, window: 1 });
            if (!valid)
                throw new common_1.UnauthorizedException('Invalid 2FA code');
        }
        await this.usersService.updateLastLogin(user.id, ip);
        return this.generateTokenPair(user.id, user.email, []);
    }
    async generate2FASecret(userId) {
        const secret = speakeasy.generateSecret({ name: `ForexBot:${userId}`, length: 32 });
        await this.usersService.storeTotpSecret(userId, secret.base32);
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
        return { secret: secret.base32, qrCodeUrl };
    }
    async enable2FA(userId, totpCode) {
        const user = await this.usersService.findById(userId);
        if (!user.totpSecret)
            throw new common_1.BadRequestException('2FA setup not initiated');
        const valid = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token: totpCode, window: 1 });
        if (!valid)
            throw new common_1.BadRequestException('Invalid TOTP code');
        await this.usersService.enableTotp(userId);
        return { message: '2FA enabled successfully' };
    }
    async refreshTokens(userId, _refreshToken) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException();
        return this.generateTokenPair(user.id, user.email, []);
    }
    async validateApiKey(rawKey) {
        const keyHash = (0, crypto_1.createHash)('sha256').update(rawKey).digest('hex');
        return this.usersService.findActiveApiKey(keyHash);
    }
    async generateTokenPair(userId, email, roles) {
        const payload = { sub: userId, email, roles };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload),
            this.jwtService.signAsync(payload, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') }),
        ]);
        return { accessToken, refreshToken, tokenType: 'Bearer' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService, jwt_1.JwtService, config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map