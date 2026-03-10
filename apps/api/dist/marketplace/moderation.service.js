"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ModerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bot_entity_1 = require("./entities/bot.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const VALID_TRANSITIONS = {
    draft: ['pending_review'],
    pending_review: ['active', 'draft'],
    active: ['suspended', 'archived'],
    suspended: ['active', 'archived'],
    archived: [],
};
let ModerationService = ModerationService_1 = class ModerationService {
    constructor(botRepo, dataSource, notificationsService) {
        this.botRepo = botRepo;
        this.dataSource = dataSource;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(ModerationService_1.name);
    }
    async submitForReview(botId, userId, notes) {
        const bot = await this.findBotOwnedByUser(botId, userId);
        if (bot.status !== 'draft') {
            throw new common_1.BadRequestException(`Bot cannot be submitted from status '${bot.status}'. Must be in 'draft'.`);
        }
        const [listing] = await this.dataSource.query(`SELECT id FROM bot_listings WHERE bot_id = $1 AND deleted_at IS NULL LIMIT 1`, [botId]);
        if (!listing) {
            throw new common_1.BadRequestException('You must create a listing before submitting for review');
        }
        await this.botRepo.update(botId, { status: 'pending_review' });
        await this.insertModerationEvent(botId, userId, 'submitted', notes);
        this.logger.log({ msg: 'Bot submitted for review', botId, userId });
        return { success: true, status: 'pending_review' };
    }
    async approveBat(botId, adminUserId, notes) {
        const bot = await this.botRepo.findOne({ where: { id: botId } });
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        if (bot.status !== 'pending_review') {
            throw new common_1.BadRequestException(`Bot must be in 'pending_review' to approve. Current status: '${bot.status}'`);
        }
        await this.dataSource.transaction(async (manager) => {
            await manager.update(bot_entity_1.Bot, botId, {
                status: 'active',
                isVerified: true,
                verifiedAt: new Date(),
            });
            await manager.query(`UPDATE bot_listings SET status = 'published'
         WHERE bot_id = $1 AND status = 'draft' AND deleted_at IS NULL`, [botId]);
        });
        await this.insertModerationEvent(botId, adminUserId, 'approved', notes);
        const sellerUserId = await this.getSellerUserId(bot.sellerId);
        if (sellerUserId) {
            await this.notificationsService.notifyBotApproved(sellerUserId, bot.name, botId);
        }
        this.logger.log({ msg: 'Bot approved', botId, adminUserId });
        return { success: true, status: 'active' };
    }
    async rejectBot(botId, adminUserId, reason) {
        const bot = await this.botRepo.findOne({ where: { id: botId } });
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        if (bot.status !== 'pending_review') {
            throw new common_1.BadRequestException(`Bot must be in 'pending_review' to reject. Current status: '${bot.status}'`);
        }
        await this.botRepo.update(botId, { status: 'draft' });
        await this.insertModerationEvent(botId, adminUserId, 'rejected', reason);
        const sellerUserId = await this.getSellerUserId(bot.sellerId);
        if (sellerUserId) {
            await this.notificationsService.notifyBotRejected(sellerUserId, bot.name, botId, reason);
        }
        this.logger.log({ msg: 'Bot rejected', botId, adminUserId, reason });
        return { success: true, status: 'draft' };
    }
    async suspendBot(botId, adminUserId, reason) {
        const bot = await this.botRepo.findOne({ where: { id: botId } });
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        await this.dataSource.transaction(async (manager) => {
            await manager.update(bot_entity_1.Bot, botId, { status: 'suspended' });
            await manager.query(`UPDATE bot_listings SET status = 'unpublished' WHERE bot_id = $1 AND deleted_at IS NULL`, [botId]);
        });
        await this.insertModerationEvent(botId, adminUserId, 'suspended', reason);
        this.logger.log({ msg: 'Bot suspended', botId, adminUserId, reason });
        return { success: true, status: 'suspended' };
    }
    async findBotOwnedByUser(botId, userId) {
        const [bot] = await this.dataSource.query(`SELECT b.* FROM bots b
       JOIN seller_profiles sp ON sp.id = b.seller_id
       WHERE b.id = $1 AND sp.user_id = $2 AND b.deleted_at IS NULL
       LIMIT 1`, [botId, userId]);
        if (!bot)
            throw new common_1.NotFoundException('Bot not found or not owned by you');
        return bot;
    }
    async getSellerUserId(sellerId) {
        const [sp] = await this.dataSource.query(`SELECT user_id FROM seller_profiles WHERE id = $1 LIMIT 1`, [sellerId]);
        return sp?.user_id ?? null;
    }
    async insertModerationEvent(botId, actorId, action, notes) {
        await this.dataSource.query(`INSERT INTO bot_moderation_events (bot_id, actor_id, action, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`, [botId, actorId, action, notes ?? null]).catch(() => {
        });
    }
};
exports.ModerationService = ModerationService;
exports.ModerationService = ModerationService = ModerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bot_entity_1.Bot)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService])
], ModerationService);
//# sourceMappingURL=moderation.service.js.map