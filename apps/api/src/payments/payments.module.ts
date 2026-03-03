import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { LicensingModule } from '../licensing/licensing.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), LicensingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
