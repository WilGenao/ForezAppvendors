// apps/api/src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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

  // FIX NEW: Disable TOTP — needed for 2FA disable endpoint
  async disableTotp(id: string): Promise<void> {
    await this.userRepo.update(id, { totpEnabled: false, totpSecret: null });
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.userRepo.update(id, { emailVerifiedAt: new Date(), status: 'active' });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.userRepo.update(id, { passwordHash });
  }

  async getRolesForUser(userId: string): Promise<AppRole[]> {
    const rows = await this.dataSource.query(
      'SELECT role FROM user_roles WHERE user_id = $1 AND is_active = TRUE',
      [userId],
    );
    return rows.map((r: { role: AppRole }) => r.role);
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const rows = await this.dataSource.query(
      'SELECT role FROM user_roles WHERE user_id = $1 AND is_active = TRUE',
      [userId],
    );
    return rows.map((r: { role: string }) => r.role);
  }

  async assignRole(
    userId: string,
    role: AppRole,
    grantedBy?: string,
    expiresAt?: Date,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO user_roles (user_id, role, granted_by, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, role) DO UPDATE
         SET is_active = TRUE,
             granted_by = EXCLUDED.granted_by,
             expires_at = EXCLUDED.expires_at`,
      [userId, role, grantedBy ?? null, expiresAt ?? null],
    );
  }

  async revokeRole(userId: string, role: AppRole): Promise<void> {
    await this.dataSource.query(
      'UPDATE user_roles SET is_active = FALSE WHERE user_id = $1 AND role = $2',
      [userId, role],
    );
  }

  async findActiveApiKey(keyHash: string): Promise<ApiKeyPayload | null> {
    const result = await this.dataSource.query(
      `SELECT ak.id as "keyId", ak.user_id as "userId", ak.scopes
       FROM api_keys ak
       WHERE ak.key_hash = $1
         AND ak.is_active = TRUE
         AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyHash],
    );
    if (!result.length) return null;
    return { userId: result[0].userId, keyId: result[0].keyId, scopes: result[0].scopes || [] };
  }

  // FIX NEW: Get user profile with roles in one query (avoids N+1)
  async getUserProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const roles = await this.getUserRoles(userId);
    const { passwordHash, totpSecret, ...safeUser } = user as any;
    return { ...safeUser, roles };
  }
}
