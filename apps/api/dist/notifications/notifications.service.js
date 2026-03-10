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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(notificationRepo) {
        this.notificationRepo = notificationRepo;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async create(dto) {
        const notification = this.notificationRepo.create({
            userId: dto.userId,
            type: dto.type,
            message: dto.message,
            metadata: dto.metadata,
            read: false,
        });
        const saved = await this.notificationRepo.save(notification);
        this.logger.log({
            msg: 'Notification created',
            userId: dto.userId,
            type: dto.type,
        });
        return saved;
    }
    async listForUser(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [notifications, total, unreadCount] = await Promise.all([
            this.notificationRepo.find({
                where: { userId },
                order: { read: 'ASC', createdAt: 'DESC' },
                take: limit,
                skip: offset,
            }),
            this.notificationRepo.count({ where: { userId } }),
            this.notificationRepo.count({ where: { userId, read: false } }),
        ]);
        return {
            notifications,
            total,
            unreadCount,
            page,
            pages: Math.ceil(total / limit),
        };
    }
    async markRead(notificationId, userId) {
        const notification = await this.notificationRepo.findOne({
            where: { id: notificationId },
        });
        if (!notification)
            throw new common_1.NotFoundException('Notification not found');
        if (notification.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
        if (!notification.read) {
            await this.notificationRepo.update(notificationId, {
                read: true,
                readAt: new Date(),
            });
        }
        return { success: true };
    }
    async markAllRead(userId) {
        const result = await this.notificationRepo.update({ userId, read: false }, { read: true, readAt: new Date() });
        return { count: result.affected ?? 0 };
    }
    async notifyBotApproved(sellerUserId, botName, botId) {
        await this.create({
            userId: sellerUserId,
            type: notification_entity_1.NotificationType.BOT_APPROVED,
            message: `Your bot "${botName}" has been approved and is now live on the marketplace.`,
            metadata: { botId },
        });
    }
    async notifyBotRejected(sellerUserId, botName, botId, reason) {
        await this.create({
            userId: sellerUserId,
            type: notification_entity_1.NotificationType.BOT_REJECTED,
            message: `Your bot "${botName}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
            metadata: { botId, reason },
        });
    }
    async notifyNewSale(sellerUserId, botName, botId, amountCents) {
        await this.create({
            userId: sellerUserId,
            type: notification_entity_1.NotificationType.NEW_SALE,
            message: `New sale! "${botName}" was purchased for $${(amountCents / 100).toFixed(2)}.`,
            metadata: { botId, amountCents },
        });
    }
    async notifyLicenseExpiring(userId, botName, licenseId, daysLeft) {
        await this.create({
            userId,
            type: notification_entity_1.NotificationType.LICENSE_EXPIRING,
            message: `Your license for "${botName}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew to keep access.`,
            metadata: { licenseId, daysLeft },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map