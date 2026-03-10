import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(user: JwtPayload, botId: string, dto: CreateReviewDto): Promise<{
        id: string;
        message: string;
    }>;
    listForBot(botId: string, query: ListReviewsQueryDto): Promise<{
        reviews: import("./entities/review.entity").Review[];
        total: number;
        page: number;
        pages: number;
    }>;
    getRating(botId: string): Promise<{
        botId: string;
        avgRating: number;
        totalReviews: number;
        distribution: Record<string, number>;
    }>;
    markHelpful(user: JwtPayload, reviewId: string): Promise<{
        helpful_count: number;
    }>;
}
