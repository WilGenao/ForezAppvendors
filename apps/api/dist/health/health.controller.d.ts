import Redis from 'ioredis';
import { DataSource } from 'typeorm';
export declare class HealthController {
    private readonly redis;
    private readonly dataSource;
    constructor(redis: Redis, dataSource: DataSource);
    health(): Promise<{
        status: string;
        db: boolean;
        redis: boolean;
        uptime: number;
        timestamp: string;
    }>;
}
