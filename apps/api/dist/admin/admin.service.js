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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let AdminService = AdminService_1 = class AdminService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    async getPlatformStats() {
        const [stats] = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL)                          AS total_users,
        (SELECT COUNT(*) FROM users WHERE status = 'active' AND deleted_at IS NULL)    AS active_users,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days')      AS new_users_7d,
        (SELECT COUNT(*) FROM bots WHERE deleted_at IS NULL)                           AS total_bots,
        (SELECT COUNT(*) FROM bots WHERE status = 'active' AND deleted_at IS NULL)     AS active_bots,
        (SELECT COUNT(*) FROM bots WHERE status = 'pending_review')                    AS bots_pending_review,
        (SELECT COUNT(*) FROM kyc_verifications WHERE status = 'pending')              AS kyc_pending,
        (SELECT COUNT(*) FROM kyc_verifications WHERE status = 'under_review')         AS kyc_under_review,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active')                   AS active_subscriptions,
        (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE status = 'succeeded'
           AND created_at > NOW() - INTERVAL '30 days')                                AS revenue_30d_cents,
        (SELECT COALESCE(SUM(platform_fee_cents), 0) FROM payments WHERE status = 'succeeded'
           AND created_at > NOW() - INTERVAL '30 days')                                AS platform_fee_30d_cents,
        (SELECT COUNT(*) FROM anomaly_flags WHERE is_resolved = false)                 AS open_anomalies
    `);
        return {
            users: {
                total: parseInt(stats.total_users),
                active: parseInt(stats.active_users),
                newLast7d: parseInt(stats.new_users_7d),
            },
            bots: {
                total: parseInt(stats.total_bots),
                active: parseInt(stats.active_bots),
                pendingReview: parseInt(stats.bots_pending_review),
            },
            kyc: {
                pending: parseInt(stats.kyc_pending),
                underReview: parseInt(stats.kyc_under_review),
                totalQueued: parseInt(stats.kyc_pending) + parseInt(stats.kyc_under_review),
            },
            subscriptions: {
                active: parseInt(stats.active_subscriptions),
            },
            revenue: {
                last30dCents: parseInt(stats.revenue_30d_cents),
                platformFeeLast30dCents: parseInt(stats.platform_fee_30d_cents),
                last30dFormatted: `$${(parseInt(stats.revenue_30d_cents) / 100).toFixed(2)}`,
                platformFeeFormatted: `$${(parseInt(stats.platform_fee_30d_cents) / 100).toFixed(2)}`,
            },
            anomalies: {
                open: parseInt(stats.open_anomalies),
            },
        };
    }
    async listBotsForReview(status, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const whereStatus = status ? `AND b.status = '${status}'` : `AND b.status IN ('pending_review','suspended')`;
        const [rows, countResult] = await Promise.all([
            this.dataSource.query(`SELECT
           b.id, b.name, b.slug, b.status, b.mt_platform, b.created_at, b.updated_at,
           b.is_verified, b.total_subscribers,
           sp.display_name AS seller_name,
           sp.is_verified_seller,
           u.email AS seller_email,
           COALESCE(
             json_agg(DISTINCT jsonb_build_object(
               'type', af.anomaly_type,
               'severity', af.severity,
               'description', af.description
             )) FILTER (WHERE af.id IS NOT NULL AND af.is_resolved = false),
             '[]'
           ) AS anomalies
         FROM bots b
         JOIN seller_profiles sp ON sp.id = b.seller_id
         JOIN users u ON u.id = sp.user_id
         LEFT JOIN anomaly_flags af ON af.bot_id = b.id
         WHERE b.deleted_at IS NULL ${whereStatus}
         GROUP BY b.id, sp.display_name, sp.is_verified_seller, u.email
         ORDER BY b.created_at DESC
         LIMIT $1 OFFSET $2`, [limit, offset]),
            this.dataSource.query(`SELECT COUNT(*) FROM bots WHERE deleted_at IS NULL ${whereStatus}`),
        ]);
        return { data: rows, total: parseInt(countResult[0].count, 10), page, limit };
    }
    async updateBotStatus(botId, newStatus, adminId, reason) {
        const [bot] = await this.dataSource.query(`SELECT id, name, status FROM bots WHERE id = $1 AND deleted_at IS NULL`, [botId]);
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        await this.dataSource.transaction(async (manager) => {
            await manager.query(`UPDATE bots SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, botId]);
            await manager.query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, metadata)
         VALUES ($1, 'update', 'bot', $2, $3, $4)`, [
                adminId,
                botId,
                JSON.stringify({ before: { status: bot.status }, after: { status: newStatus } }),
                JSON.stringify({ reason: reason ?? null, admin_action: true }),
            ]);
        });
        this.logger.log({ msg: 'Bot status updated', botId, newStatus, adminId });
        return { message: `Bot ${newStatus === 'active' ? 'approved' : newStatus}.` };
    }
    async listUsers(search, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const searchClause = search
            ? `AND u.email ILIKE $3`
            : '';
        const params = [limit, offset];
        if (search)
            params.push(`%${search}%`);
        const [rows, countResult] = await Promise.all([
            this.dataSource.query(`SELECT
           u.id, u.email, u.status, u.email_verified_at, u.created_at, u.last_login_at,
           COALESCE(
             json_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL AND ur.is_active = true),
             '[]'
           ) AS roles,
           (SELECT status FROM kyc_verifications WHERE user_id = u.id
            ORDER BY submitted_at DESC LIMIT 1) AS kyc_status
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         WHERE u.deleted_at IS NULL ${searchClause}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`, params),
            this.dataSource.query(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL ${search ? `AND email ILIKE $1` : ''}`, search ? [`%${search}%`] : []),
        ]);
        return { data: rows, total: parseInt(countResult[0].count, 10), page, limit };
    }
    async setUserStatus(userId, status, adminId) {
        const [user] = await this.dataSource.query(`SELECT id, status FROM users WHERE id = $1`, [userId]);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.dataSource.query(`UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2`, [status, userId]);
        await this.dataSource.query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'update', 'user', $2, $3)`, [adminId, userId, JSON.stringify({ before: { status: user.status }, after: { status } })]);
        this.logger.log({ msg: 'User status changed', userId, status, adminId });
        return { message: `User ${status}.` };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], AdminService);
//# sourceMappingURL=admin.service.js.map