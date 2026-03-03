"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('app', () => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    analyticsEngineUrl: process.env.ANALYTICS_ENGINE_URL || 'http://localhost:8000',
}));
//# sourceMappingURL=app.config.js.map