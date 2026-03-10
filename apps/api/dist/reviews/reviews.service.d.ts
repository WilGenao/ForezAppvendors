import { Repository, DataSource } from 'typeorm';
import Redis from 'ioredis';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ReviewsService {
    private readonly reviewRepo;
    private readonly redis;
    private readonly dataSource;
    private readonly notificationsService;
    private readonly logger;
    constructor(reviewRepo: Repository<Review>, redis: Redis, dataSource: DataSource, notificationsService: NotificationsService);
    create(userId: string, dto: CreateReviewDto): Promise<{
        id: string;
        message: string;
    }>;
    listForBot(botId: string, page?: number, limit?: number): Promise<{
        reviews: Review[];
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
    markHelpful(reviewId: string, userId: string): Promise<{
        helpful_count: number;
    }>;
    private updateBotRatingAggregate;
}
