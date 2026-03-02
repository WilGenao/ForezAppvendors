import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../common/errors/app.errors';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { email: dto.email, passwordHash, status: 'pending_verification' } });
      await tx.userRole.create({ data: { userId: u.id, role: dto.role } });
      if (dto.role === 'seller') {
        await tx.sellerProfile.create({ data: { userId: u.id, displayName: dto.displayName ?? dto.email.split('@')[0] } });
      } else {
        await tx.buyerProfile.create({ data: { userId: u.id, displayName: dto.displayName } });
      }
      return u;
    });

    return { userId: user.id, message: 'Registration successful. Please verify your email.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: { roles: { where: { revokedAt: null } }, sellerProfile: true },
    });
    if (!user) throw new UnauthorizedError('Invalid credentials');
    if (user.status === 'banned') throw new UnauthorizedError('Account banned');
    if (user.status === 'suspended') throw new UnauthorizedError('Account suspended');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedError('Invalid credentials');

    if (user.totpEnabled) {
      if (!dto.totpCode) throw new UnauthorizedError('2FA code required');
      const valid = speakeasy.totp.verify({ secret: user.totpSecret!, encoding: 'base32', token: dto.totpCode, window: 1 });
      if (!valid) throw new UnauthorizedError('Invalid 2FA code');
    }

    const roles = user.roles.map((r) => r.role);
    const payload = { sub: user.id, email: user.email, roles, sellerId: user.sellerProfile?.id };

    return {
      accessToken: this.jwtService.sign(payload, { secret: this.config.get('jwt.accessSecret'), expiresIn: this.config.get('jwt.accessExpiresIn') }),
      refreshToken: this.jwtService.sign({ sub: user.id }, { secret: this.config.get('jwt.refreshSecret'), expiresIn: this.config.get('jwt.refreshExpiresIn') }),
      user: { id: user.id, email: user.email, roles },
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: any;
    try { payload = this.jwtService.verify(refreshToken, { secret: this.config.get('jwt.refreshSecret') }); }
    catch { throw new UnauthorizedError('Invalid refresh token'); }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { roles: { where: { revokedAt: null } }, sellerProfile: true },
    });
    if (!user) throw new UnauthorizedError('User not found');

    const roles = user.roles.map((r) => r.role);
    return {
      accessToken: this.jwtService.sign(
        { sub: user.id, email: user.email, roles, sellerId: user.sellerProfile?.id },
        { secret: this.config.get('jwt.accessSecret'), expiresIn: this.config.get('jwt.accessExpiresIn') },
      ),
    };
  }

  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);
    const secret = speakeasy.generateSecret({ name: `ForexBot Marketplace (${user.email})`, length: 20 });
    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret.base32 } });
    return { secret: secret.base32, qrCode: await QRCode.toDataURL(secret.otpauth_url!) };
  }

  async enable2FA(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new UnauthorizedError('2FA setup not started');
    const valid = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token, window: 1 });
    if (!valid) throw new UnauthorizedError('Invalid TOTP token');
    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    return { enabled: true };
  }
}
