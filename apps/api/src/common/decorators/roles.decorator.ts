// apps/api/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export type AppRole = 'buyer' | 'seller' | 'admin' | 'moderator';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
