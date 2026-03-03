-- ============================================================
-- ForexBot Marketplace — Schema Compatible PostgreSQL 18
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- TIPOS ENUMERADOS
CREATE TYPE user_status        AS ENUM ('pending_verification','active','suspended','banned');
CREATE TYPE user_role          AS ENUM ('buyer','seller','admin','moderator');
CREATE TYPE kyc_status         AS ENUM ('not_started','pending','under_review','approved','rejected');
CREATE TYPE bot_status         AS ENUM ('draft','pending_review','active','suspended','archived');
CREATE TYPE listing_type       AS ENUM ('subscription_monthly','subscription_yearly','one_time');
CREATE TYPE listing_status     AS ENUM ('draft','published','unpublished','removed');
CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled','unpaid');
CREATE TYPE payment_status     AS ENUM ('pending','succeeded','failed','refunded','disputed');
CREATE TYPE license_status     AS ENUM ('active','expired','revoked','suspended');
CREATE TYPE anomaly_severity   AS ENUM ('info','warning','critical');
CREATE TYPE trade_direction    AS ENUM ('buy','sell');
CREATE TYPE verification_status AS ENUM ('pending','processing','completed','failed');
CREATE TYPE audit_action       AS ENUM ('create','update','delete','login','logout','payment','license_check','kyc_submit','kyc_approve','kyc_reject','api_key_create','api_key_revoke');

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE users (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) NOT NULL,
    email_verified_at   TIMESTAMPTZ,
    password_hash       TEXT        NOT NULL,
    totp_secret         TEXT,
    totp_enabled        BOOLEAN     NOT NULL DEFAULT FALSE,
    status              user_status NOT NULL DEFAULT 'pending_verification',
    last_login_at       TIMESTAMPTZ,
    last_login_ip       INET,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    created_by          UUID
);

CREATE UNIQUE INDEX idx_users_email_unique ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLA: user_roles
-- ============================================================
CREATE TABLE user_roles (
    id          UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role        user_role NOT NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by  UUID      REFERENCES users(id),
    revoked_at  TIMESTAMPTZ,
    revoked_by  UUID      REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_user_roles_unique ON user_roles(user_id, role) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id) WHERE revoked_at IS NULL;

-- ============================================================
-- TABLA: seller_profiles
-- ============================================================
CREATE TABLE seller_profiles (
    id                      UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID    NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    display_name            VARCHAR(100) NOT NULL,
    bio                     TEXT,
    website_url             VARCHAR(500),
    stripe_account_id       VARCHAR(100),
    stripe_onboarding_done  BOOLEAN NOT NULL DEFAULT FALSE,
    total_revenue_cents     BIGINT  NOT NULL DEFAULT 0,
    total_sales             INTEGER NOT NULL DEFAULT 0,
    avg_rating              DECIMAL(3,2),
    is_verified_seller      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID
);

CREATE INDEX idx_seller_profiles_user_id ON seller_profiles(user_id);

-- ============================================================
-- TABLA: buyer_profiles
-- ============================================================
CREATE TABLE buyer_profiles (
    id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID    NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    display_name        VARCHAR(100),
    notification_prefs  JSONB   NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID
);

-- ============================================================
-- TABLA: kyc_verifications
-- ============================================================
CREATE TABLE kyc_verifications (
    id                  UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status              kyc_status NOT NULL DEFAULT 'pending',
    document_type       VARCHAR(50),
    document_front_url  TEXT,
    document_back_url   TEXT,
    selfie_url          TEXT,
    rejection_reason    TEXT,
    reviewed_by         UUID       REFERENCES users(id),
    reviewed_at         TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID
);

CREATE INDEX idx_kyc_user_id ON kyc_verifications(user_id);
CREATE INDEX idx_kyc_status  ON kyc_verifications(status) WHERE status IN ('pending','under_review');

-- ============================================================
-- TABLA: categories
-- ============================================================
CREATE TABLE categories (
    id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id   UUID    REFERENCES categories(id),
    slug        VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID
);

-- ============================================================
-- TABLA: bots
-- ============================================================
CREATE TABLE bots (
    id                  UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id           UUID       NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
    name                VARCHAR(200) NOT NULL,
    slug                VARCHAR(200) NOT NULL,
    short_description   VARCHAR(500),
    description         TEXT,
    status              bot_status NOT NULL DEFAULT 'draft',
    mt_platform         VARCHAR(10) NOT NULL CHECK (mt_platform IN ('MT4','MT5','BOTH')),
    currency_pairs      TEXT[]     NOT NULL DEFAULT '{}',
    timeframes          TEXT[]     NOT NULL DEFAULT '{}',
    risk_level          SMALLINT   CHECK (risk_level BETWEEN 1 AND 5),
    is_verified         BOOLEAN    NOT NULL DEFAULT FALSE,
    verified_at         TIMESTAMPTZ,
    verified_by         UUID       REFERENCES users(id),
    total_subscribers   INTEGER    NOT NULL DEFAULT 0,
    total_reviews       INTEGER    NOT NULL DEFAULT 0,
    avg_rating          DECIMAL(3,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    created_by          UUID
);

CREATE UNIQUE INDEX idx_bots_slug_unique ON bots(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_bots_seller_id ON bots(seller_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bots_status ON bots(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bots_name_trgm ON bots USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLA: bot_versions
-- ============================================================
CREATE TABLE bot_versions (
    id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id          UUID    NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    version         VARCHAR(20) NOT NULL,
    changelog       TEXT,
    file_url        TEXT    NOT NULL,
    file_hash       VARCHAR(64) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    is_current      BOOLEAN NOT NULL DEFAULT FALSE,
    released_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID,
    CONSTRAINT bot_versions_unique UNIQUE (bot_id, version)
);

CREATE INDEX idx_bot_versions_bot_id ON bot_versions(bot_id);
CREATE INDEX idx_bot_versions_current ON bot_versions(bot_id, is_current) WHERE is_current = TRUE;

-- ============================================================
-- TABLA: bot_listings
-- ============================================================
CREATE TABLE bot_listings (
    id                      UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id                  UUID           NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    bot_version_id          UUID           NOT NULL REFERENCES bot_versions(id),
    category_id             UUID           REFERENCES categories(id),
    listing_type            listing_type   NOT NULL,
    status                  listing_status NOT NULL DEFAULT 'draft',
    price_cents             INTEGER        NOT NULL CHECK (price_cents >= 0),
    currency                CHAR(3)        NOT NULL DEFAULT 'USD',
    trial_days              SMALLINT       NOT NULL DEFAULT 0,
    stripe_price_id         VARCHAR(100),
    stripe_product_id       VARCHAR(100),
    max_licenses            INTEGER,
    features                JSONB          NOT NULL DEFAULT '[]',
    published_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,
    created_by              UUID
);

CREATE INDEX idx_bot_listings_bot_id ON bot_listings(bot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bot_listings_status ON bot_listings(status) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLA: subscriptions
-- ============================================================
CREATE TABLE subscriptions (
    id                      UUID                NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID                NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    bot_listing_id          UUID                NOT NULL REFERENCES bot_listings(id) ON DELETE RESTRICT,
    status                  subscription_status NOT NULL DEFAULT 'trialing',
    stripe_subscription_id  VARCHAR(100)        UNIQUE,
    stripe_customer_id      VARCHAR(100),
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    trial_end               TIMESTAMPTZ,
    canceled_at             TIMESTAMPTZ,
    cancel_at_period_end    BOOLEAN             NOT NULL DEFAULT FALSE,
    metadata                JSONB               NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    created_by              UUID
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_listing_id ON subscriptions(bot_listing_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status IN ('active','trialing','past_due');

-- ============================================================
-- TABLA: payments
-- ============================================================
CREATE TABLE payments (
    id                      UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id         UUID           REFERENCES subscriptions(id) ON DELETE RESTRICT,
    user_id                 UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status                  payment_status NOT NULL DEFAULT 'pending',
    amount_cents            INTEGER        NOT NULL CHECK (amount_cents > 0),
    currency                CHAR(3)        NOT NULL DEFAULT 'USD',
    platform_fee_cents      INTEGER        NOT NULL DEFAULT 0,
    seller_payout_cents     INTEGER        NOT NULL DEFAULT 0,
    stripe_payment_intent_id VARCHAR(100)  UNIQUE,
    stripe_charge_id        VARCHAR(100),
    failure_code            VARCHAR(100),
    failure_message         TEXT,
    refunded_at             TIMESTAMPTZ,
    refund_reason           TEXT,
    metadata                JSONB          NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_by              UUID
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- TABLA: stripe_events
-- ============================================================
CREATE TABLE stripe_events (
    id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id VARCHAR(100) NOT NULL UNIQUE,
    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB   NOT NULL,
    processed_at    TIMESTAMPTZ,
    processing_error TEXT,
    retry_count     SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_events_unprocessed ON stripe_events(created_at) WHERE processed_at IS NULL;

-- ============================================================
-- TABLA: trade_history
-- ============================================================
CREATE TABLE trade_history (
    id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id          UUID           NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    ticket          BIGINT         NOT NULL,
    direction       trade_direction NOT NULL,
    symbol          VARCHAR(20)    NOT NULL,
    lot_size        DECIMAL(10,2)  NOT NULL CHECK (lot_size > 0),
    open_price      DECIMAL(10,5)  NOT NULL,
    close_price     DECIMAL(10,5),
    stop_loss       DECIMAL(10,5),
    take_profit     DECIMAL(10,5),
    profit_usd      DECIMAL(15,5),
    commission_usd  DECIMAL(15,5)  NOT NULL DEFAULT 0,
    swap_usd        DECIMAL(15,5)  NOT NULL DEFAULT 0,
    opened_at       TIMESTAMPTZ    NOT NULL,
    closed_at       TIMESTAMPTZ,
    duration_seconds INTEGER,
    magic_number    INTEGER,
    comment         VARCHAR(200),
    account_balance_before DECIMAL(15,2),
    account_balance_after  DECIMAL(15,2),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT trade_history_bot_ticket_unique UNIQUE (bot_id, ticket)
);

CREATE INDEX idx_trade_history_bot_time ON trade_history(bot_id, opened_at DESC);
CREATE INDEX idx_trade_history_closed ON trade_history(bot_id, closed_at DESC) WHERE closed_at IS NOT NULL;

-- ============================================================
-- TABLA: performance_snapshots
-- ============================================================
CREATE TABLE performance_snapshots (
    id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id              UUID    NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    snapshot_date       DATE    NOT NULL,
    total_trades        INTEGER NOT NULL DEFAULT 0,
    winning_trades      INTEGER NOT NULL DEFAULT 0,
    losing_trades       INTEGER NOT NULL DEFAULT 0,
    win_rate            DECIMAL(5,4),
    profit_factor       DECIMAL(10,4),
    sharpe_ratio        DECIMAL(10,4),
    sortino_ratio       DECIMAL(10,4),
    max_drawdown_pct    DECIMAL(7,4),
    max_drawdown_abs    DECIMAL(15,2),
    total_profit_usd    DECIMAL(15,2),
    avg_rrr             DECIMAL(10,4),
    expectancy_usd      DECIMAL(10,4),
    recovery_factor     DECIMAL(10,4),
    calmar_ratio        DECIMAL(10,4),
    total_trades_period INTEGER NOT NULL DEFAULT 0,
    period_type         VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (period_type IN ('daily','weekly','monthly','all_time')),
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT perf_snapshots_unique UNIQUE (bot_id, snapshot_date, period_type)
);

CREATE INDEX idx_perf_snapshots_bot_date ON performance_snapshots(bot_id, snapshot_date DESC);

-- ============================================================
-- TABLA: anomaly_flags
-- ============================================================
CREATE TABLE anomaly_flags (
    id              UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id          UUID             NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    anomaly_type    VARCHAR(100)     NOT NULL,
    severity        anomaly_severity NOT NULL,
    score           SMALLINT         NOT NULL CHECK (score BETWEEN 0 AND 100),
    description     TEXT             NOT NULL,
    details         JSONB            NOT NULL DEFAULT '{}',
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID             REFERENCES users(id),
    resolution_note TEXT,
    detected_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anomaly_flags_bot_id ON anomaly_flags(bot_id) WHERE is_active = TRUE;

-- ============================================================
-- TABLA: licenses
-- ============================================================
CREATE TABLE licenses (
    id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id     UUID           NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
    user_id             UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    bot_id              UUID           NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    bot_version_id      UUID           NOT NULL REFERENCES bot_versions(id),
    license_key         VARCHAR(64)    NOT NULL UNIQUE,
    status              license_status NOT NULL DEFAULT 'active',
    max_activations     SMALLINT       NOT NULL DEFAULT 1,
    current_activations SMALLINT       NOT NULL DEFAULT 0,
    hwid_hash           TEXT[],
    expires_at          TIMESTAMPTZ,
    last_validated_at   TIMESTAMPTZ,
    revoke_reason       TEXT,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_by          UUID
);

CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_user_id ON licenses(user_id) WHERE status = 'active';

-- ============================================================
-- TABLA: license_validations
-- ============================================================
CREATE TABLE license_validations (
    id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id      UUID    NOT NULL REFERENCES licenses(id) ON DELETE RESTRICT,
    is_valid        BOOLEAN NOT NULL,
    hwid_hash       VARCHAR(200),
    ip_address      INET,
    mt_account_id   VARCHAR(100),
    mt_platform     VARCHAR(10),
    response_code   VARCHAR(50) NOT NULL,
    response_ms     INTEGER,
    validated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_license_validations_license ON license_validations(license_id);
CREATE INDEX idx_license_validations_time ON license_validations USING BRIN(validated_at);

-- ============================================================
-- TABLA: reviews
-- ============================================================
CREATE TABLE reviews (
    id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id          UUID    NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    user_id         UUID    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    subscription_id UUID    REFERENCES subscriptions(id),
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           VARCHAR(200),
    body            TEXT,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    is_moderated    BOOLEAN NOT NULL DEFAULT FALSE,
    moderated_by    UUID    REFERENCES users(id),
    moderated_at    TIMESTAMPTZ,
    moderation_note TEXT,
    helpful_count   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    created_by      UUID
);

CREATE UNIQUE INDEX idx_reviews_unique_user_bot ON reviews(user_id, bot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_bot_id ON reviews(bot_id) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLA: reputation_scores
-- ============================================================
CREATE TABLE reputation_scores (
    id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id              UUID    NOT NULL UNIQUE REFERENCES bots(id) ON DELETE RESTRICT,
    overall_score       DECIMAL(5,2) NOT NULL DEFAULT 0,
    performance_score   DECIMAL(5,2) NOT NULL DEFAULT 0,
    reliability_score   DECIMAL(5,2) NOT NULL DEFAULT 0,
    community_score     DECIMAL(5,2) NOT NULL DEFAULT 0,
    review_count        INTEGER NOT NULL DEFAULT 0,
    last_calculated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         REFERENCES users(id),
    action          audit_action NOT NULL,
    entity_type     VARCHAR(100),
    entity_id       UUID,
    ip_address      INET,
    user_agent      TEXT,
    changes         JSONB,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    correlation_id  UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs USING BRIN(created_at);

-- ============================================================
-- TABLA: api_keys
-- ============================================================
CREATE TABLE api_keys (
    id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID    NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name            VARCHAR(100) NOT NULL,
    key_hash        VARCHAR(64) NOT NULL UNIQUE,
    key_prefix      VARCHAR(16) NOT NULL,
    scopes          TEXT[]  NOT NULL DEFAULT '{}',
    last_used_at    TIMESTAMPTZ,
    last_used_ip    INET,
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    revoked_at      TIMESTAMPTZ,
    revoked_by      UUID    REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash) WHERE is_active = TRUE;

-- ============================================================
-- TRIGGER: updated_at automatico
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'users','seller_profiles','buyer_profiles','kyc_verifications',
        'categories','bots','bot_versions','bot_listings','subscriptions',
        'payments','licenses','anomaly_flags','reviews','reputation_scores',
        'api_keys','user_roles'
    ]) LOOP
        EXECUTE format('CREATE TRIGGER trigger_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t, t);
    END LOOP;
END $$;
