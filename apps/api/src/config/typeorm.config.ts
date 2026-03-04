// apps/api/src/config/typeorm.config.ts
// Used by TypeORM CLI for migrations.
// Run: npx typeorm migration:generate -d src/config/typeorm.config.ts src/migrations/MigrationName
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  logging: false,
});
