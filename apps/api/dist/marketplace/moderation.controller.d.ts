import { ModerationService } from './moderation.service';
import { SubmitForReviewDto } from './dto/submit-review.dto';
import { ModerateBotsDto } from '../admin/dto/moderate-bot.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class ModerationController {
    private readonly moderationService;
    constructor(moderationService: ModerationService);
    submitForReview(user: JwtPayload, botId: string, dto: SubmitForReviewDto): Promise<{
        success: boolean;
        status: string;
    }>;
}
export declare class AdminModerationController {
    private readonly moderationService;
    constructor(moderationService: ModerationService);
    approve(admin: JwtPayload, botId: string, dto: ModerateBotsDto): Promise<{
        success: boolean;
        status: string;
    }>;
    reject(admin: JwtPayload, botId: string, dto: ModerateBotsDto): Promise<{
        success: boolean;
        status: string;
    }>;
    suspend(admin: JwtPayload, botId: string, dto: ModerateBotsDto): Promise<{
        success: boolean;
        status: string;
    }>;
}
