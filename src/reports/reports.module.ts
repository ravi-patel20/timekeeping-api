import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AdminAuthService } from '../common/admin-auth.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, AdminAuthService],
})
export class ReportsModule {}

