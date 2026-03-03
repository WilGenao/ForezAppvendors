import { MarketplaceService } from './marketplace.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { ListBotsQueryDto } from './dto/list-bots-query.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class MarketplaceController {
    private readonly marketplaceService;
    constructor(marketplaceService: MarketplaceService);
    listBots(query: ListBotsQueryDto): Promise<any>;
    getBotDetails(slug: string): Promise<any>;
    createBot(user: JwtPayload, dto: CreateBotDto): Promise<import("./entities/bot.entity").Bot>;
}
