// apps/api/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { KycModule } from '../kyc/kyc.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [KycModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
