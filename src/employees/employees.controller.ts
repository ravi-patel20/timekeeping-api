import { Body, Controller, Get, Post, Req, BadRequestException } from '@nestjs/common';
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

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      passcode?: string;
      email?: string;
      phone?: string;
      payType?: string;
      status?: string;
    },
  ) {
    const deviceToken = req.cookies?.device_session;
    const adminToken = req.cookies?.admin_session;
    const { propertyId } = await this.adminAuth.requireAdmin(deviceToken, adminToken);

    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const passcode = body.passcode?.trim();

    if (!firstName || !lastName) {
      throw new BadRequestException('firstName and lastName are required');
    }
    if (!passcode) {
      throw new BadRequestException('passcode is required');
    }

    const employee = await this.employeesService.createForProperty(propertyId, {
      firstName,
      lastName,
      passcode,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      payType: body.payType?.trim().toLowerCase() || null,
      status: body.status?.trim().toLowerCase() || null,
    });

    return employee;
  }
}
