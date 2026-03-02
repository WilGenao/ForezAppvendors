import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ApiKeyPayload } from '../common/decorators/api-key-user.decorator';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  async create(input: { email: string; passwordHash: string }): Promise<User> {
    return this.userRepo.save(this.userRepo.create({ email: input.email, passwordHash: input.passwordHash, status: 'pending_verification' }));
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.createQueryBuilder('u').addSelect('u.totpSecret').where('u.email = :email', { email }).getOne();
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

  async findActiveApiKey(keyHash: string): Promise<ApiKeyPayload | null> {
    const result = await this.userRepo.query(
      `SELECT ak.id as "keyId", ak.user_id as "userId", ak.scopes FROM api_keys ak WHERE ak.key_hash = $1 AND ak.is_active = true AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyHash],
    );
    if (!result.length) return null;
    return { userId: result[0].userId, keyId: result[0].keyId, scopes: result[0].scopes || [] };
  }
}
