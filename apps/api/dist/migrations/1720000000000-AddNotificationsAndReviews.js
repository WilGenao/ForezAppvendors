"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddNotificationsAndReviews1720000000000 = void 0;
class AddNotificationsAndReviews1720000000000 {
    constructor() {
        this.name = 'AddNotificationsAndReviews1720000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM (
          'NEW_SALE',
          'BOT_APPROVED',
          'BOT_REJECTED',
          'NEW_REVIEW',
          'LICENSE_EXPIRING',
          'SUBSCRIPTION_CANCELED',
          'PAYMENT_FAILED',
          'KYC_APPROVED',
          'KYC_REJECTED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        notification_type NOT NULL,
        message     TEXT NOT NULL,
        read        BOOLEAN NOT NULL DEFAULT FALSE,
        read_at     TIMESTAMPTZ,
        metadata    JSONB,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created   ON notifications(created_at DESC);
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_moderated   BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count  INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS total_reviews  INTEGER NOT NULL DEFAULT 0;
      EXCEPTION WHEN undefined_table THEN
        -- Reviews table doesn't exist yet; InitialSchema should create it
        RAISE NOTICE 'reviews table not found — skipping column additions';
      END $$
    `);
        await queryRunner.query(`
      ALTER TABLE bots ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0;
    `).catch(() => { });
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bot_moderation_events (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bot_id     UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        actor_id   UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        action     VARCHAR(50) NOT NULL,  -- submitted | approved | rejected | suspended
        notes      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bot_mod_events_bot_id ON bot_moderation_events(bot_id);
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS license_validations (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        license_key      VARCHAR(50)  NOT NULL,  -- Truncated for privacy
        ip_address       INET,
        is_valid         BOOLEAN NOT NULL,
        validation_code  VARCHAR(30)  NOT NULL,
        validated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_license_val_key     ON license_validations(license_key);
      CREATE INDEX IF NOT EXISTS idx_license_val_created ON license_validations(validated_at DESC);
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS license_validations`);
        await queryRunner.query(`DROP TABLE IF EXISTS bot_moderation_events`);
        await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
        await queryRunner.query(`DROP TYPE IF EXISTS notification_type`);
    }
}
exports.AddNotificationsAndReviews1720000000000 = AddNotificationsAndReviews1720000000000;
//# sourceMappingURL=1720000000000-AddNotificationsAndReviews.js.map