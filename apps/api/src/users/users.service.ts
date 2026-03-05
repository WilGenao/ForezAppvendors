// apps/api/src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { ApiKeyPayload } from '../common/decorators/api-key-user.decorator';
import { AppRole } from '../common/decorators/roles.decorator';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(input: { email: string; passwordHash: string }): Promise<User> {
    const user = await this.userRepo.save(
      this.userRepo.create({
        email: input.email,
        passwordHash: input.passwordHash,
        status: 'pending_verification',
      }),
    );

    // All new users get the 'buyer' role by default
    await this.assignRole(user.id, 'buyer');
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.totpSecret')
      .where('u.email = :email', { email })
      .getOne();
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date(), lastLoginIp: ip });
  }

  async storeTotpSecret(id: string, secret: string): Promise<void> {
    await this.userRepo.update(id, { totpSecret: secret });
  }

  async enableTotp(id: string): Promise<void> {
    await this.userRepo.update(id, { totpEnabled: true });
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.userRepo.update(id, { emailVerifiedAt: new Date(), status: 'active' });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.userRepo.update(id, { passwordHash });
  }

  // ─── Role management ────────────────────────────────────────────────────────

  /**
   * Returns the active roles for a user from the user_roles table.
   * Called on every authenticated request by JwtStrategy.
   */
  async getRolesForUser(userId: string): Promise<AppRole[]> {
    const rows = await this.dataSource.query(
      `SELECT role FROM user_roles
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [userId],
    );
    return rows.map((r: { role: AppRole }) => r.role);
  }

  /**
   * Assigns a role to a user. Idempotent — safe to call multiple times.
   * Used by: registration (buyer), KYC approval (seller), admin panel (admin).
   */
  async assignRole(
    userId: string,
    role: AppRole,
    grantedBy?: string,
    expiresAt?: Date,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO user_roles (user_id, role, granted_by, expires_at)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (user_id, role) DO UPDATE
         SET revoked_at IS NULL,
             granted_by = EXCLUDED.granted_by,
             expires_at = EXCLUDED.expires_at,
             updated_at = NOW()`,
      [userId, role, grantedBy ?? null, expiresAt ?? null],
    );
  }

  /**
   * Revokes a role. Soft-revoke: sets revoked_at IS NOT NULL, preserves audit trail.
   */
  async revokeRole(userId: string, role: AppRole): Promise<void> {
    await this.dataSource.query(
      `UPDATE user_roles SET revoked_at IS NOT NULL, updated_at = NOW()
       WHERE user_id = $1 AND role = $2`,
      [userId, role],
    );
  }

  async findActiveApiKey(keyHash: string): Promise<ApiKeyPayload | null> {
    const result = await this.dataSource.query(
      `SELECT ak.id as "keyId", ak.user_id as "userId", ak.scopes
       FROM api_keys ak
       WHERE ak.key_hash = $1
         AND ak.revoked_at IS NULL
         AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyHash],
    );
    if (!result.length) return null;
    return { userId: result[0].userId, keyId: result[0].keyId, scopes: result[0].scopes || [] };
  }
}

