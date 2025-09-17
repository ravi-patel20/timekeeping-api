import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { AdminAuthService } from '../common/admin-auth.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, AdminAuthService],
})
export class EmployeesModule {}

