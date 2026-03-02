import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundError } from '../../common/errors/app.errors';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true, email: true, emailVerifiedAt: true, status: true, totpEnabled: true, createdAt: true,
        roles: { where: { revokedAt: null }, select: { role: true } },
        sellerProfile: { select: { id: true, displayName: true, isVerifiedSeller: true, avgRating: true } },
        buyerProfile: { select: { id: true, displayName: true, timezone: true, preferredCurrency: true } },
      },
    });
    if (!user) throw new NotFoundError('User', userId);
    return user;
  }
}
