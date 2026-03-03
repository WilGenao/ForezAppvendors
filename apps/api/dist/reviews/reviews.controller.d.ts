import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    listForBot(botId: string, page?: number, limit?: number): Promise<any>;
    create(user: JwtPayload, dto: CreateReviewDto): Promise<{
        id: any;
        message: string;
    }>;
}
