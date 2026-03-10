// apps/api/src/seller/seller.module.ts
import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SellerController],
  providers: [SellerService],
})
export class SellerModule {}
