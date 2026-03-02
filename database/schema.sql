-- ============================================================
-- ForexBot Marketplace — Schema Completo v1.0
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE user_status AS ENUM ('pending_verification','active','suspended','banned');
CREATE TYPE kyc_status AS ENUM ('not_started','pending','under_review','approved','rejected');
CREATE TYPE bot_status AS ENUM ('draft','pending_review','active','suspended','archived');
CREATE TYPE listing_type AS ENUM ('subscription_monthly','subscription_yearly','one_time');
CREATE TYPE listing_status AS ENUM ('draft','published','unpublished','removed');
CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled','unpaid');
CREATE TYPE payment_status AS ENUM ('pending','succeeded','failed','refunded','disputed');
CREATE TYPE license_status AS ENUM ('active','expired','revoked','suspended');
CREATE TYPE anomaly_severity AS ENUM ('info','warning','critical');
CREATE TYPE trade_direction AS ENUM ('buy','sell');

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) NOT NULL,
    email_verified_at   TIMESTAMPTZ,
    password_hash       TEXT NOT NULL,
    totp_secret         TEXT,
    totp_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    status              user_status NOT NULL DEFAULT 'pending_verification',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    created_by          UUID REFERENCES users(id),
    CONSTRAINT users_email_unique UNIQUE (email) WHERE deleted_at IS NULL
);
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role VARCHAR(50) NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    CONSTRAINT user_roles_unique UNIQUE (user_id, role) WHERE revoked_at IS NULL
);
CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE revoked_at IS NULL;

CREATE TABLE seller_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    website_url VARCHAR(500),
    stripe_account_id VARCHAR(100),
    stripe_onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
    total_revenue_cents BIGINT NOT NULL DEFAULT 0,
    total_bots_sold INTEGER NOT NULL DEFAULT 0,
    avg_rating NUMERIC(3,2),
    is_verified_seller BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT seller_profiles_user_unique UNIQUE (user_id)
);

CREATE TABLE buyer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    display_name VARCHAR(100),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    preferred_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT buyer_profiles_user_unique UNIQUE (user_id)
);

CREATE TABLE kyc_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status kyc_status NOT NULL DEFAULT 'not_started',
    provider VARCHAR(50) NOT NULL DEFAULT 'manual',
    provider_reference VARCHAR(255),
    document_type VARCHAR(50),
    document_blob_url TEXT,
    selfie_blob_url TEXT,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kyc_user ON kyc_verifications(user_id);
CREATE INDEX idx_kyc_status ON kyc_verifications(status) WHERE status NOT IN ('approved','rejected');

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    short_description VARCHAR(500),
    description TEXT,
    status bot_status NOT NULL DEFAULT 'draft',
    mt_platform VARCHAR(10) NOT NULL DEFAULT 'MT5' CHECK (mt_platform IN ('MT4','MT5','BOTH')),
    currency_pairs TEXT[] NOT NULL DEFAULT '{}',
    timeframes TEXT[] NOT NULL DEFAULT '{}',
    cover_image_url TEXT,
    demo_video_url TEXT,
    category_id UUID REFERENCES categories(id),
    is_track_record_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    CONSTRAINT bots_slug_unique UNIQUE (slug) WHERE deleted_at IS NULL
);
CREATE INDEX idx_bots_seller ON bots(seller_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bots_status ON bots(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bots_name_trgm ON bots USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE TABLE bot_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    version_tag VARCHAR(50) NOT NULL,
    changelog TEXT,
    file_blob_url TEXT NOT NULL,
    file_hash_sha256 VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    CONSTRAINT bot_versions_unique_tag UNIQUE (bot_id, version_tag)
);
CREATE INDEX idx_bot_versions_bot ON bot_versions(bot_id);

CREATE TABLE bot_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    listing_type listing_type NOT NULL,
    status listing_status NOT NULL DEFAULT 'draft',
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    trial_days INTEGER NOT NULL DEFAULT 0,
    max_licenses INTEGER,
    stripe_price_id VARCHAR(100),
    features JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    CONSTRAINT bot_listings_unique UNIQUE (bot_id, listing_type) WHERE deleted_at IS NULL
);
CREATE INDEX idx_bot_listings_bot ON bot_listings(bot_id) WHERE deleted_at IS NULL;

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    listing_id UUID NOT NULL REFERENCES bot_listings(id) ON DELETE RESTRICT,
    status subscription_status NOT NULL DEFAULT 'trialing',
    stripe_subscription_id VARCHAR(100) UNIQUE,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    trial_end TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_buyer ON subscriptions(buyer_id);
CREATE INDEX idx_subscriptions_listing ON subscriptions(listing_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    platform_fee_cents INTEGER NOT NULL DEFAULT 0,
    seller_amount_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status payment_status NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(100) UNIQUE,
    stripe_charge_id VARCHAR(100),
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_buyer ON payments(buyer_id);
CREATE INDEX idx_payments_seller ON payments(seller_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE TABLE stripe_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id VARCHAR(100) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stripe_events_unprocessed ON stripe_events(created_at) WHERE processed = FALSE;

CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id),
    payment_id UUID REFERENCES payments(id),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    license_key VARCHAR(64) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status license_status NOT NULL DEFAULT 'active',
    allowed_account_ids TEXT[] NOT NULL DEFAULT '{}',
    max_activations INTEGER NOT NULL DEFAULT 1,
    activations_used INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    last_validated_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_status ON licenses(status) WHERE status = 'active';

CREATE TABLE license_validations (
    id UUID DEFAULT uuid_generate_v4(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE RESTRICT,
    account_id VARCHAR(50),
    broker_name VARCHAR(100),
    mt_version VARCHAR(10),
    ip_address INET,
    result VARCHAR(20) NOT NULL CHECK (result IN ('valid','invalid','expired','revoked','rate_limited')),
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, validated_at)
) PARTITION BY RANGE (validated_at);
CREATE TABLE license_validations_2025 PARTITION OF license_validations FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE license_validations_2026 PARTITION OF license_validations FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE license_validations_2027 PARTITION OF license_validations FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE INDEX idx_lic_val_license ON license_validations(license_id, validated_at DESC);

CREATE TABLE trade_history (
    id UUID DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    bot_version_id UUID REFERENCES bot_versions(id),
    ticket BIGINT,
    symbol VARCHAR(20) NOT NULL,
    direction trade_direction NOT NULL,
    volume_lots NUMERIC(10,2) NOT NULL,
    open_price NUMERIC(15,5) NOT NULL,
    close_price NUMERIC(15,5),
    open_time TIMESTAMPTZ NOT NULL,
    close_time TIMESTAMPTZ,
    profit_usd NUMERIC(15,2),
    commission_usd NUMERIC(15,2) NOT NULL DEFAULT 0,
    swap_usd NUMERIC(15,2) NOT NULL DEFAULT 0,
    stop_loss NUMERIC(15,5),
    take_profit NUMERIC(15,5),
    magic_number INTEGER,
    comment VARCHAR(255),
    account_balance_at_open NUMERIC(15,2),
    account_balance_at_close NUMERIC(15,2),
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, bot_id)
) PARTITION BY HASH (bot_id);
CREATE TABLE trade_history_p0 PARTITION OF trade_history FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE trade_history_p1 PARTITION OF trade_history FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE trade_history_p2 PARTITION OF trade_history FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE trade_history_p3 PARTITION OF trade_history FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE trade_history_p4 PARTITION OF trade_history FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE trade_history_p5 PARTITION OF trade_history FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE trade_history_p6 PARTITION OF trade_history FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE trade_history_p7 PARTITION OF trade_history FOR VALUES WITH (MODULUS 8, REMAINDER 7);
CREATE INDEX idx_trade_bot_time ON trade_history(bot_id, open_time DESC);
CREATE INDEX idx_trade_bot_close ON trade_history(bot_id, close_time DESC) WHERE close_time IS NOT NULL;

CREATE TABLE performance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    snapshot_date DATE NOT NULL,
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    losing_trades INTEGER NOT NULL DEFAULT 0,
    win_rate NUMERIC(5,4),
    profit_factor NUMERIC(10,4),
    sharpe_ratio NUMERIC(10,4),
    sortino_ratio NUMERIC(10,4),
    max_drawdown_pct NUMERIC(8,4),
    max_drawdown_abs NUMERIC(15,2),
    total_profit_usd NUMERIC(15,2),
    total_loss_usd NUMERIC(15,2),
    net_profit_usd NUMERIC(15,2),
    expectancy_usd NUMERIC(10,4),
    avg_rrr NUMERIC(10,4),
    recovery_factor NUMERIC(10,4),
    calmar_ratio NUMERIC(10,4),
    trade_date_start DATE,
    trade_date_end DATE,
    calculation_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    raw_metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT perf_snapshots_unique UNIQUE (bot_id, snapshot_date)
);
CREATE INDEX idx_perf_snapshots_bot ON performance_snapshots(bot_id, snapshot_date DESC);

CREATE TABLE anomaly_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    anomaly_type VARCHAR(100) NOT NULL,
    severity anomaly_severity NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}',
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_note TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_anomaly_bot ON anomaly_flags(bot_id);
CREATE INDEX idx_anomaly_unresolved ON anomaly_flags(bot_id) WHERE is_resolved = FALSE;

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE RESTRICT,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200),
    body TEXT,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    is_moderated BOOLEAN NOT NULL DEFAULT FALSE,
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMPTZ,
    moderation_note TEXT,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT reviews_one_per_buyer UNIQUE (bot_id, reviewer_id)
);
CREATE INDEX idx_reviews_bot ON reviews(bot_id) WHERE deleted_at IS NULL;

CREATE TABLE reputation_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
    overall_score NUMERIC(4,2) NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    response_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    dispute_count INTEGER NOT NULL DEFAULT 0,
    last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT rep_scores_unique UNIQUE (seller_id)
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT '{"track_record:write"}',
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix) WHERE revoked_at IS NULL;

CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    action VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    correlation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE TABLE audit_logs_2025 PARTITION OF audit_logs FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_logs_2027 PARTITION OF audit_logs FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','user_roles','seller_profiles','buyer_profiles',
    'kyc_verifications','categories','bots','bot_versions','bot_listings',
    'subscriptions','payments','licenses','performance_snapshots','anomaly_flags',
    'reviews','reputation_scores','api_keys']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;
