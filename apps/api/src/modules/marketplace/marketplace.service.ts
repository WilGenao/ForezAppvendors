import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundError, ForbiddenError, ValidationError } from '../../common/errors/app.errors';

export interface CreateBotDto {
  name: string;
  shortDescription?: string;
  description?: string;
  mtPlatform: 'MT4' | 'MT5' | 'BOTH';
  currencyPairs: string[];
  timeframes: string[];
  categoryId?: string;
}

export interface CreateListingDto {
  botId: string;
  listingType: string;
  priceCents: number;
  currency?: string;
  trialDays?: number;
  maxLicenses?: number;
  features?: any[];
  stripePriceId?: string;
}

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async createBot(sellerId: string, userId: string, dto: CreateBotDto) {
    const sellerProfile = await this.prisma.sellerProfile.findFirst({ where: { userId, deletedAt: null } });
    if (!sellerProfile) throw new ForbiddenError('User is not a seller');

    const slug = await this.generateUniqueSlug(dto.name);

    return this.prisma.bot.create({
      data: {
        sellerId: sellerProfile.id,
        name: dto.name,
        slug,
        shortDescription: dto.shortDescription,
        description: dto.description,
        mtPlatform: dto.mtPlatform,
        currencyPairs: dto.currencyPairs,
        timeframes: dto.timeframes,
        categoryId: dto.categoryId,
        status: 'draft',
        createdBy: userId,
      },
    });
  }

  async getMarketplaceListing(filters: { categoryId?: string; search?: string; page: number; limit: number; sortBy?: string }) {
    const { page, limit, search, categoryId, sortBy } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'active',
      deletedAt: null,
      listings: { some: { status: 'published', deletedAt: null } },
    };

    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = sortBy === 'rating'
      ? { seller: { reputationScore: { avgRating: 'desc' } } }
      : sortBy === 'newest'
      ? { createdAt: 'desc' }
      : { createdAt: 'desc' };

    const [bots, total] = await Promise.all([
      this.prisma.bot.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          seller: {
            select: { displayName: true, isVerifiedSeller: true, avgRating: true },
          },
          category: { select: { name: true, slug: true } },
          listings: {
            where: { status: 'published', deletedAt: null },
            select: { id: true, listingType: true, priceCents: true, currency: true, trialDays: true },
          },
          performanceSnapshots: {
            orderBy: { snapshotDate: 'desc' },
            take: 1,
            select: { winRate: true, profitFactor: true, sharpeRatio: true, maxDrawdownPct: true, totalTrades: true },
          },
        },
      }),
      this.prisma.bot.count({ where }),
    ]);

    return {
      bots,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBotBySlug(slug: string, requesterId?: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { slug, status: 'active', deletedAt: null },
      include: {
        seller: { select: { id: true, displayName: true, isVerifiedSeller: true, avgRating: true, totalBotsSold: true } },
        category: true,
        listings: { where: { status: 'published', deletedAt: null } },
        performanceSnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
        anomalyFlags: { where: { isResolved: false, severity: { in: ['warning', 'critical'] } }, select: { anomalyType: true, severity: true, title: true, score: true } },
        reviews: {
          where: { deletedAt: null, isModerated: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { rating: true, title: true, body: true, createdAt: true, isVerifiedPurchase: true },
        },
      },
    });

    if (!bot) throw new NotFoundError('Bot', slug);

    // Check if requester has active license
    let hasActiveLicense = false;
    if (requesterId) {
      const license = await this.prisma.license.findFirst({ where: { buyerId: requesterId, botId: bot.id, status: 'active' } });
      hasActiveLicense = !!license;
    }

    return { ...bot, hasActiveLicense };
  }

  async submitTrackRecord(botId: string, sellerId: string, trades: any[]) {
    const bot = await this.prisma.bot.findFirst({ where: { id: botId, deletedAt: null } });
    if (!bot) throw new NotFoundError('Bot', botId);

    const sellerProfile = await this.prisma.sellerProfile.findFirst({ where: { userId: sellerId } });
    if (!sellerProfile || bot.sellerId !== sellerProfile.id) throw new ForbiddenError('Not your bot');

    if (trades.length < 1) throw new ValidationError('No trades provided');
    if (trades.length > 50000) throw new ValidationError('Too many trades in single batch. Max 50000.');

    // Batch insert trades
    await this.prisma.$executeRaw`
      INSERT INTO trade_history (id, bot_id, symbol, direction, volume_lots, open_price, close_price, open_time, close_time, profit_usd, commission_usd, swap_usd, stop_loss, take_profit, magic_number, comment, account_balance_at_open, account_balance_at_close, raw_data, created_at)
      SELECT gen_random_uuid(), ${botId}::uuid, t.symbol, t.direction::trade_direction, t.volume_lots, t.open_price, t.close_price, t.open_time::timestamptz, t.close_time::timestamptz, t.profit_usd, COALESCE(t.commission_usd, 0), COALESCE(t.swap_usd, 0), t.stop_loss, t.take_profit, t.magic_number, t.comment, t.account_balance_at_open, t.account_balance_at_close, t.raw_data::jsonb, NOW()
      FROM jsonb_to_recordset(${JSON.stringify(trades)}::jsonb) AS t(symbol text, direction text, volume_lots numeric, open_price numeric, close_price numeric, open_time text, close_time text, profit_usd numeric, commission_usd numeric, swap_usd numeric, stop_loss numeric, take_profit numeric, magic_number int, comment text, account_balance_at_open numeric, account_balance_at_close numeric, raw_data jsonb)
    `;

    // Trigger async analysis via Analytics Engine
    // Fire and forget — don't block the response
    this.triggerAnalysis(botId).catch((err) => console.error('Analytics trigger failed', err));

    return { imported: trades.length, status: 'processing' };
  }

  private async triggerAnalysis(botId: string) {
    const analyticsUrl = process.env.ANALYTICS_ENGINE_URL ?? 'http://analytics:8000';
    const response = await fetch(`${analyticsUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id: botId }),
    });
    if (!response.ok) throw new Error(`Analytics engine returned ${response.status}`);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = base;
    let counter = 0;
    while (await this.prisma.bot.findFirst({ where: { slug, deletedAt: null } })) {
      counter++;
      slug = `${base}-${counter}`;
    }
    return slug;
  }
}
