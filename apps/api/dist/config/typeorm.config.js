"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
const path_1 = require("path");
dotenv.config({ path: (0, path_1.join)(__dirname, '../../.env') });
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [(0, path_1.join)(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [(0, path_1.join)(__dirname, '../migrations/*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    logging: false,
});
//# sourceMappingURL=typeorm.config.js.map