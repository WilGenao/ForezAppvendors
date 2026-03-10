// apps/api/src/licensing/licensing.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';
import { License } from './entities/license.entity';

@Module({
  imports: [TypeOrmModule.forFeature([License])],
  controllers: [LicensingController],
  providers: [LicensingService],
  exports: [LicensingService],
})
export class LicensingModule {}
