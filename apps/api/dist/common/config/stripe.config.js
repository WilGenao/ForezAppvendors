"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('stripe', () => ({
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    connectClientId: process.env.STRIPE_CONNECT_CLIENT_ID,
}));
//# sourceMappingURL=stripe.config.js.map