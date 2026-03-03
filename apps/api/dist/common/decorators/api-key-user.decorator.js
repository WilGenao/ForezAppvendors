"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyUser = void 0;
const common_1 = require("@nestjs/common");
exports.ApiKeyUser = (0, common_1.createParamDecorator)((_data, ctx) => ctx.switchToHttp().getRequest().apiKeyUser);
//# sourceMappingURL=api-key-user.decorator.js.map