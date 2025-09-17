import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ClockModule } from './clock/clock.module';
import { EmployeesModule } from './employees/employees.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [AuthModule, ClockModule, EmployeesModule, ReportsModule],
})
export class AppModule {}
