import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ReportsService } from './reports.service';
import { AdminAuthService } from '../common/admin-auth.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService, private readonly adminAuth: AdminAuthService) {}

  @Get('employees-hours')
  async employeesHours(
    @Query('start') start: string,
    @Query('end') end: string,
    @Req() req: Request,
  ) {
    const deviceToken = req.cookies?.device_session;
    const adminToken = req.cookies?.admin_session;
    const { propertyId } = await this.adminAuth.requireAdmin(deviceToken, adminToken);
    return this.reportsService.employeesWithHours(propertyId, start, end);
  }
}

