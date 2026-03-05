"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1709500000000 = void 0;
class InitialSchema1709500000000 {
    constructor() {
        this.name = 'InitialSchema1709500000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('pending_verification','active','suspended','banned');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('buyer','seller','admin','moderator');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE kyc_status AS ENUM ('not_started','pending','under_review','approved','rejected');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE bot_status AS ENUM ('draft','pending_review','active','suspended','archived');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE listing_type AS ENUM ('subscription_monthly','subscription_yearly','one_time');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE listing_status AS ENUM ('draft','published','unpublished','removed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled','unpaid');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending','succeeded','failed','refunded','disputed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE license_status AS ENUM ('active','expired','revoked','suspended');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE audit_action AS ENUM ('create','update','delete','login','logout','payment','license_check','kyc_submit','kyc_approve','kyc_reject','api_key_create','api_key_revoke');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        email             VARCHAR(255) NOT NULL,
        email_verified_at TIMESTAMPTZ,
        password_hash     TEXT         NOT NULL,
        totp_secret       TEXT,
        totp_enabled      BOOLEAN      NOT NULL DEFAULT FALSE,
        status            user_status  NOT NULL DEFAULT 'pending_verification',
        last_login_at     TIMESTAMPTZ,
        last_login_ip     INET,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        deleted_at        TIMESTAMPTZ,
        created_by        UUID         REFERENCES users(id),
        CONSTRAINT users_email_unique UNIQUE (email) WHERE deleted_at IS NULL
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id          UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role        user_role NOT NULL,
        granted_by  UUID      REFERENCES users(id),
        expires_at  TIMESTAMPTZ,
        is_active   BOOLEAN   NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT user_roles_unique UNIQUE (user_id, role)
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS seller_profiles (
        id                   UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id              UUID    NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
        display_name         VARCHAR(100) NOT NULL,
        bio                  TEXT,
        website_url          VARCHAR(500),
        is_verified_seller   BOOLEAN NOT NULL DEFAULT FALSE,
        avg_rating           DECIMAL(3,2),
        total_bots           INTEGER NOT NULL DEFAULT 0,
        total_subscribers    INTEGER NOT NULL DEFAULT 0,
        stripe_account_id    VARCHAR(100),
        stripe_onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS buyer_profiles (
        id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id      UUID    NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
        display_name VARCHAR(100),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kyc_verifications (
        id                  UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id             UUID       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status              kyc_status NOT NULL DEFAULT 'pending',
        document_type       VARCHAR(50) NOT NULL,
        document_front_url  TEXT NOT NULL,
        document_back_url   TEXT,
        selfie_url          TEXT NOT NULL,
        rejection_reason    TEXT,
        reviewed_by         UUID       REFERENCES users(id),
        submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at         TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bots (
        id                UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
        seller_id         UUID       NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
        name              VARCHAR(200) NOT NULL,
        slug              VARCHAR(200) NOT NULL UNIQUE,
        short_description VARCHAR(500),
        description       TEXT,
        status            bot_status NOT NULL DEFAULT 'draft',
        mt_platform       VARCHAR(10) NOT NULL,
        currency_pairs    TEXT[]     NOT NULL DEFAULT '{}',
        timeframes        TEXT[]     NOT NULL DEFAULT '{}',
        risk_level        SMALLINT,
        is_verified       BOOLEAN    NOT NULL DEFAULT FALSE,
        verified_at       TIMESTAMPTZ,
        avg_rating        DECIMAL(3,2),
        total_subscribers INTEGER    NOT NULL DEFAULT 0,
        total_reviews     INTEGER    NOT NULL DEFAULT 0,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at        TIMESTAMPTZ
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bot_versions (
        id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        bot_id      UUID    NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        version     VARCHAR(50) NOT NULL,
        changelog   TEXT,
        file_url    TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bot_listings (
        id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
        bot_id          UUID           NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
        listing_type    listing_type   NOT NULL,
        price_cents     INTEGER        NOT NULL,
        currency        VARCHAR(3)     NOT NULL DEFAULT 'USD',
        trial_days      INTEGER        NOT NULL DEFAULT 0,
        stripe_price_id VARCHAR(100),
        status          listing_status NOT NULL DEFAULT 'draft',
        published_at    TIMESTAMPTZ,
        created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id                       UUID                NOT NULL DEFAULT uuid_generate_v4(),
        user_id                  UUID                NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        bot_listing_id           UUID                NOT NULL REFERENCES bot_listings(id) ON DELETE RESTRICT,
        stripe_subscription_id   VARCHAR(100),
        status                   subscription_status NOT NULL DEFAULT 'trialing',
        current_period_start     TIMESTAMPTZ,
        current_period_end       TIMESTAMPTZ,
        canceled_at              TIMESTAMPTZ,
        created_at               TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id)
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                       UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
        subscription_id          UUID           REFERENCES subscriptions(id),
        user_id                  UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status                   payment_status NOT NULL DEFAULT 'pending',
        amount_cents             INTEGER        NOT NULL,
        currency                 VARCHAR(3)     NOT NULL DEFAULT 'USD',
        platform_fee_cents       INTEGER        NOT NULL DEFAULT 0,
        seller_payout_cents      INTEGER        NOT NULL DEFAULT 0,
        stripe_payment_intent_id VARCHAR(100)   UNIQUE,
        metadata                 JSONB          NOT NULL DEFAULT '{}',
        created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
        subscription_id   UUID           REFERENCES subscriptions(id),
        user_id           UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        bot_id            UUID           NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
        bot_version_id    UUID           REFERENCES bot_versions(id),
        license_key       VARCHAR(100)   NOT NULL UNIQUE,
        status            license_status NOT NULL DEFAULT 'active',
        hwid_hash         TEXT[]         NOT NULL DEFAULT '{}',
        max_activations   INTEGER        NOT NULL DEFAULT 1,
        current_activations INTEGER      NOT NULL DEFAULT 0,
        expires_at        TIMESTAMPTZ,
        last_validated_at TIMESTAMPTZ,
        created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS performance_snapshots (
        id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        bot_id             UUID    NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        period_type        VARCHAR(20) NOT NULL,
        snapshot_date      DATE    NOT NULL,
        total_trades       INTEGER,
        win_rate           DECIMAL(5,4),
        profit_factor      DECIMAL(8,4),
        sharpe_ratio       DECIMAL(8,4),
        sortino_ratio      DECIMAL(8,4),
        calmar_ratio       DECIMAL(8,4),
        max_drawdown_pct   DECIMAL(8,4),
        expectancy_usd     DECIMAL(12,2),
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS anomaly_flags (
        id           UUID   PRIMARY KEY DEFAULT uuid_generate_v4(),
        bot_id       UUID   NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        anomaly_type VARCHAR(100) NOT NULL,
        severity     VARCHAR(20) NOT NULL,
        description  TEXT,
        is_resolved  BOOLEAN NOT NULL DEFAULT FALSE,
        resolved_at  TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        bot_id              UUID    NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        user_id             UUID    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        subscription_id     UUID    REFERENCES subscriptions(id),
        rating              SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title               VARCHAR(200),
        body                TEXT    NOT NULL,
        is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
        is_moderated        BOOLEAN NOT NULL DEFAULT FALSE,
        helpful_count       INTEGER NOT NULL DEFAULT 0,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at          TIMESTAMPTZ,
        CONSTRAINT reviews_one_per_user_bot UNIQUE (user_id, bot_id) WHERE deleted_at IS NULL
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id        UUID         REFERENCES users(id),
        action         audit_action NOT NULL,
        entity_type    VARCHAR(100),
        entity_id      UUID,
        ip_address     INET,
        changes        JSONB,
        metadata       JSONB        NOT NULL DEFAULT '{}',
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        name        VARCHAR(100) NOT NULL,
        key_hash    VARCHAR(64)  NOT NULL UNIQUE,
        key_prefix  VARCHAR(16)  NOT NULL,
        scopes      TEXT[]       NOT NULL DEFAULT '{}',
        last_used_at TIMESTAMPTZ,
        last_used_ip INET,
        expires_at  TIMESTAMPTZ,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        revoked_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id) WHERE revoked_at IS NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bots_seller ON bots(seller_id) WHERE deleted_at IS NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status) WHERE deleted_at IS NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_licenses_user ON licenses(user_id)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_verifications(user_id)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_perf_bot_period ON performance_snapshots(bot_id, period_type, snapshot_date DESC)`);
        await queryRunner.query(`
      CREATE OR REPLACE VIEW v_active_bot_listings AS
      SELECT
        bl.id            AS listing_id,
        bl.listing_type,
        bl.price_cents,
        bl.currency,
        bl.trial_days,
        b.id             AS bot_id,
        b.name           AS bot_name,
        b.slug           AS bot_slug,
        b.mt_platform,
        b.is_verified,
        b.avg_rating,
        b.total_subscribers,
        sp.display_name  AS seller_name,
        sp.is_verified_seller,
        ps.sharpe_ratio,
        ps.max_drawdown_pct,
        ps.win_rate,
        ps.profit_factor,
        ps.total_trades  AS all_time_trades
      FROM bot_listings bl
      JOIN bots b              ON b.id = bl.bot_id AND b.deleted_at IS NULL
      JOIN seller_profiles sp  ON sp.id = b.seller_id
      LEFT JOIN performance_snapshots ps
          ON ps.bot_id = b.id
          AND ps.period_type = 'all_time'
          AND ps.snapshot_date = (
            SELECT MAX(snapshot_date) FROM performance_snapshots
            WHERE bot_id = b.id AND period_type = 'all_time'
          )
      WHERE bl.status = 'published'
        AND bl.deleted_at IS NULL
        AND b.status = 'active'
    `);
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql
    `);
        for (const table of ['users', 'user_roles', 'seller_profiles', 'buyer_profiles',
            'bots', 'bot_listings', 'subscriptions', 'payments', 'licenses',
            'performance_snapshots', 'anomaly_flags', 'reviews', 'api_keys', 'kyc_verifications']) {
            await queryRunner.query(`
        CREATE TRIGGER trigger_updated_at_${table}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `).catch(() => { });
        }
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP VIEW IF EXISTS v_active_bot_listings`);
        for (const t of ['audit_logs', 'api_keys', 'reviews', 'anomaly_flags', 'performance_snapshots',
            'licenses', 'payments', 'subscriptions', 'bot_listings', 'bot_versions', 'bots',
            'kyc_verifications', 'buyer_profiles', 'seller_profiles', 'user_roles', 'users']) {
            await queryRunner.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
        }
        for (const e of ['user_status', 'user_role', 'kyc_status', 'bot_status', 'listing_type',
            'listing_status', 'subscription_status', 'payment_status', 'license_status', 'audit_action']) {
            await queryRunner.query(`DROP TYPE IF EXISTS ${e}`);
        }
    }
}
exports.InitialSchema1709500000000 = InitialSchema1709500000000;
//# sourceMappingURL=1709500000000-InitialSchema.js.map