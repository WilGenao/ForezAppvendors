import { DataSource } from 'typeorm';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class ReviewsService {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    create(userId: string, dto: CreateReviewDto): Promise<{
        id: any;
        message: string;
    }>;
    listForBot(botId: string, page?: number, limit?: number): Promise<any>;
}
