import { Repository, DataSource } from 'typeorm';
import { Bot } from './entities/bot.entity';
import { CreateBotDto } from './dto/create-bot.dto';
import { ListBotsQueryDto } from './dto/list-bots-query.dto';
import Redis from 'ioredis';
export declare class MarketplaceService {
    private readonly botRepo;
    private readonly redis;
    private readonly dataSource;
    private readonly logger;
    private readonly LISTING_CACHE_TTL;
    constructor(botRepo: Repository<Bot>, redis: Redis, dataSource: DataSource);
    createBot(userId: string, dto: CreateBotDto): Promise<Bot>;
    createListing(userId: string, botId: string, dto: {
        listingType: string;
        priceCents: number;
        trialDays: number;
    }): Promise<any>;
    listPublicBots(query: ListBotsQueryDto): Promise<any>;
    getBotDetails(slug: string): Promise<any>;
    private generateSlug;
}
