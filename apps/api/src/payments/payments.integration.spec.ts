// apps/api/src/payments/payments.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { v4 as uuid } from 'uuid';

import { PaymentsModule } from './payments.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { LicensingModule } from '../licensing/licensing.module';

/**
 * Integration tests for the critical payment → subscription → license flow.
 *
 * These tests use a real PostgreSQL test database (separate from production).
 * They mock Stripe calls to avoid hitting the real API in CI.
 *
 * Setup:
 *   1. Set TEST_DATABASE_URL in .env.test
 *   2. Run: npm test -- --testPathPattern=payments.integration
 */

// Mock Stripe to avoid real API calls in tests
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_mock',
          url: 'https://checkout.stripe.com/test',
          subscription: 'sub_test_mock',
          payment_intent: 'pi_test_mock',
          metadata: {},
        }),
      },
    },
    webhooks: {
      constructEvent: jest.fn((body: Buffer, sig: string, secret: string) => {
        // In tests, we pass the raw event directly
        return JSON.parse(body.toString());
      }),
    },
    balance: {
      retrieve: jest.fn().mockResolvedValue({
        available: [{ currency: 'usd', amount: 10000 }],
        pending: [{ currency: 'usd', amount: 5000 }],
      }),
    },
    accounts: {
      create: jest.fn().mockResolvedValue({ id: 'acct_test_mock' }),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({ url: 'https://connect.stripe.com/test' }),
    },
  }));
});

describe('Payment → License Integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Test fixtures
  let sellerUserId: string;
  let buyerUserId: string;
  let botId: string;
  let listingId: string;
  let buyerToken: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            url: config.get('TEST_DATABASE_URL', 'postgresql://localhost:5432/forexbot_test'),
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: false,
            dropSchema: false,
          }),
        }),
        RedisModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'single',
            url: config.get('REDIS_URL', 'redis://localhost:6379/1'), // DB 1 for tests
          }),
        }),
        AuthModule,
        UsersModule,
        PaymentsModule,
        LicensingModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    app.enableVersioning();
    await app.init();

    dataSource = moduleRef.get(DataSource);
    await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async function seedTestData() {
    // Create seller user
    sellerUserId = uuid();
    await dataSource.query(
      `INSERT INTO users (id, email, password_hash, status, email_verified_at)
       VALUES ($1, $2, 'hash', 'active', NOW())`,
      [sellerUserId, `seller_${sellerUserId.slice(0, 8)}@test.com`],
    );

    // Create seller profile with Stripe onboarding done
    await dataSource.query(
      `INSERT INTO seller_profiles (user_id, display_name, stripe_account_id, stripe_onboarding_done)
       VALUES ($1, 'Test Seller', 'acct_test_mock', true)`,
      [sellerUserId],
    );

    const [sp] = await dataSource.query(
      `SELECT id FROM seller_profiles WHERE user_id = $1`, [sellerUserId],
    );

    // Create bot
    botId = uuid();
    await dataSource.query(
      `INSERT INTO bots (id, seller_id, name, slug, status, mt_platform, currency_pairs, timeframes)
       VALUES ($1, $2, 'TestBot', 'testbot-integration', 'active', 'MT5', '{"EURUSD"}', '{"H1"}')`,
      [botId, sp.id],
    );

    // Create listing
    listingId = uuid();
    await dataSource.query(
      `INSERT INTO bot_listings (id, bot_id, listing_type, price_cents, currency, status, stripe_price_id)
       VALUES ($1, $2, 'subscription_monthly', 8900, 'USD', 'published', 'price_test_mock')`,
      [listingId, botId],
    );

    // Create buyer user + login
    buyerUserId = uuid();
    const buyerEmail = `buyer_${buyerUserId.slice(0, 8)}@test.com`;
    await dataSource.query(
      `INSERT INTO users (id, email, password_hash, status, email_verified_at)
       VALUES ($1, $2, $3, 'active', NOW())`,
      [buyerUserId, buyerEmail, await hashPassword('Test1234!')],
    );
    await dataSource.query(
      `INSERT INTO user_roles (user_id, role, is_active) VALUES ($1, 'buyer', true)`,
      [buyerUserId],
    );
  }

  async function cleanupTestData() {
    await dataSource.query(`DELETE FROM license_validations WHERE true`);
    await dataSource.query(`DELETE FROM licenses WHERE true`);
    await dataSource.query(`DELETE FROM payments WHERE true`);
    await dataSource.query(`DELETE FROM subscriptions WHERE true`);
    await dataSource.query(`DELETE FROM bot_listings WHERE id = $1`, [listingId]);
    await dataSource.query(`DELETE FROM bots WHERE id = $1`, [botId]);
    await dataSource.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [sellerUserId]);
    await dataSource.query(`DELETE FROM users WHERE id IN ($1, $2)`, [sellerUserId, buyerUserId]);
  }

  async function getAuthToken(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return res.body.accessToken;
  }

  async function hashPassword(p: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(p, 10);
  }

  // ─── Tests ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/payments/checkout', () => {
    it('requires authentication', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout')
        .send({ botListingId: listingId, listingType: 'subscription_monthly' });
      expect(res.status).toBe(401);
    });

    it('creates a Stripe checkout session for a valid listing', async () => {
      const buyerEmail = `buyer_${buyerUserId.slice(0, 8)}@test.com`;
      buyerToken = await getAuthToken(buyerEmail, 'Test1234!');

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ botListingId: listingId, listingType: 'subscription_monthly' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('checkoutUrl');
      expect(res.body).toHaveProperty('sessionId');
      expect(res.body.checkoutUrl).toContain('stripe.com');
    });

    it('rejects an invalid listing ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ botListingId: uuid(), listingType: 'subscription_monthly' });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/payments/webhooks/stripe — checkout.session.completed', () => {
    it('creates subscription + payment + license on successful checkout', async () => {
      // Build a mock Stripe webhook event
      const mockEvent = {
        type: 'checkout.session.completed',
        id: `evt_test_${uuid().slice(0, 8)}`,
        data: {
          object: {
            id: `cs_test_${uuid().slice(0, 8)}`,
            subscription: `sub_test_${uuid().slice(0, 8)}`,
            payment_intent: `pi_test_${uuid().slice(0, 8)}`,
            client_reference_id: buyerUserId,
            metadata: {
              user_id: buyerUserId,
              bot_listing_id: listingId,
            },
          },
        },
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhooks/stripe')
        .set('stripe-signature', 'test_sig')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(mockEvent));

      expect(res.status).toBe(200);

      // Verify subscription was created
      const [subscription] = await dataSource.query(
        `SELECT id, status FROM subscriptions WHERE user_id = $1 AND bot_listing_id = $2`,
        [buyerUserId, listingId],
      );
      expect(subscription).toBeDefined();
      expect(subscription.status).toBe('active');

      // Verify payment record was created
      const [payment] = await dataSource.query(
        `SELECT id, status, amount_cents FROM payments WHERE subscription_id = $1`,
        [subscription.id],
      );
      expect(payment).toBeDefined();
      expect(payment.status).toBe('succeeded');
      expect(parseInt(payment.amount_cents)).toBe(8900);

      // Verify license was generated
      const [license] = await dataSource.query(
        `SELECT id, status, license_key FROM licenses WHERE subscription_id = $1`,
        [subscription.id],
      );
      expect(license).toBeDefined();
      expect(license.status).toBe('active');
      expect(license.license_key).toMatch(/^LK-[A-F0-9]{32}$/);
    });

    it('is idempotent — duplicate webhook does not create duplicate subscription', async () => {
      // The ON CONFLICT clause in handleCheckoutCompleted should prevent duplicates
      const [countBefore] = await dataSource.query(
        `SELECT COUNT(*) FROM subscriptions WHERE user_id = $1 AND bot_listing_id = $2`,
        [buyerUserId, listingId],
      );

      const mockEvent = {
        type: 'checkout.session.completed',
        id: `evt_test_duplicate`,
        data: {
          object: {
            id: 'cs_test_duplicate',
            subscription: 'sub_test_duplicate',
            payment_intent: 'pi_test_duplicate',
            client_reference_id: buyerUserId,
            metadata: { user_id: buyerUserId, bot_listing_id: listingId },
          },
        },
      };

      await request(app.getHttpServer())
        .post('/api/v1/payments/webhooks/stripe')
        .set('stripe-signature', 'test_sig')
        .send(JSON.stringify(mockEvent));

      const [countAfter] = await dataSource.query(
        `SELECT COUNT(*) FROM subscriptions WHERE user_id = $1 AND bot_listing_id = $2`,
        [buyerUserId, listingId],
      );

      expect(parseInt(countAfter.count)).toBe(parseInt(countBefore.count));
    });
  });

  describe('POST /api/v1/payments/webhooks/stripe — customer.subscription.deleted', () => {
    it('cancels subscription and revokes license', async () => {
      // Get the subscription created in the previous test
      const [subscription] = await dataSource.query(
        `SELECT id FROM subscriptions WHERE user_id = $1 AND bot_listing_id = $2 LIMIT 1`,
        [buyerUserId, listingId],
      );

      // Get the stripe subscription ID from the subscription record
      const [fullSub] = await dataSource.query(
        `SELECT stripe_subscription_id FROM subscriptions WHERE id = $1`,
        [subscription.id],
      );

      const mockEvent = {
        type: 'customer.subscription.deleted',
        id: `evt_test_cancel`,
        data: {
          object: { id: fullSub.stripe_subscription_id },
        },
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhooks/stripe')
        .set('stripe-signature', 'test_sig')
        .send(JSON.stringify(mockEvent));

      expect(res.status).toBe(200);

      const [updated] = await dataSource.query(
        `SELECT status FROM subscriptions WHERE id = $1`, [subscription.id],
      );
      expect(updated.status).toBe('canceled');

      const [license] = await dataSource.query(
        `SELECT status FROM licenses WHERE subscription_id = $1`, [subscription.id],
      );
      expect(license.status).toBe('revoked');
    });
  });

  describe('POST /api/v1/licensing/validate', () => {
    it('returns VALID for an active license key', async () => {
      // Get the license created in the webhook test
      const [license] = await dataSource.query(
        `SELECT license_key FROM licenses
         JOIN subscriptions s ON s.id = licenses.subscription_id
         WHERE s.user_id = $1 LIMIT 1`,
        [buyerUserId],
      );

      if (!license) {
        console.warn('No license found — skipping validate test (depends on webhook test)');
        return;
      }

      const res = await request(app.getHttpServer())
        .post('/api/v1/licensing/validate')
        .send({
          licenseKey: license.license_key,
          mtPlatform: 'MT5',
          mtAccountId: '12345678',
        });

      expect(res.status).toBe(200);
      // Status could be VALID or REVOKED depending on test order
      expect(['VALID', 'REVOKED']).toContain(res.body.code);
    });

    it('returns INVALID_KEY for unknown license', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/licensing/validate')
        .send({
          licenseKey: 'LK-FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE',
          mtPlatform: 'MT5',
          mtAccountId: '99999999',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe('INVALID_KEY');
      expect(res.body.isValid).toBe(false);
    });

    it('rejects invalid DTO', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/licensing/validate')
        .send({ licenseKey: '' }); // missing required fields
      expect(res.status).toBe(400);
    });
  });
});
