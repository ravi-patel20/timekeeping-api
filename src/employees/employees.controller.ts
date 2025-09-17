import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { EmployeesService } from './employees.service';
import { AdminAuthService } from '../common/admin-auth.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService, private readonly adminAuth: AdminAuthService) {}

  @Get()
  async list(@Req() req: Request) {
    const deviceToken = req.cookies?.device_session;
    const adminToken = req.cookies?.admin_session;
    const { propertyId } = await this.adminAuth.requireAdmin(deviceToken, adminToken);
    return this.employeesService.listForProperty(propertyId);
  }
}

