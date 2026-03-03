"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const config_1 = require("@nestjs/config");
const helmet_1 = require("helmet");
const compression = require("compression");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { logger: ['error', 'warn', 'log'] });
    const config = app.get(config_1.ConfigService);
    app.use((0, helmet_1.default)());
    app.use(compression());
    app.enableCors({ origin: config.get('CORS_ORIGIN', 'http://localhost:3000'), credentials: true });
    app.enableVersioning({ type: common_1.VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor());
    if (config.get('NODE_ENV') !== 'production') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('ForexBot Marketplace API')
            .setDescription('Technology intermediary between bot developers and traders. NOT financial advice.')
            .setVersion('1.0')
            .addBearerAuth()
            .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
            .build();
        swagger_1.SwaggerModule.setup('api/docs', app, swagger_1.SwaggerModule.createDocument(app, swaggerConfig));
    }
    await app.listen(config.get('PORT', 3001));
}
bootstrap();
//# sourceMappingURL=main.js.map