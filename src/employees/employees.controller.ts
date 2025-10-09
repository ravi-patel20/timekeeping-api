import { Body, Controller, Get, Post, Patch, Put, Param, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { EmployeesService } from './employees.service';
import { AdminAuthService } from '../common/admin-auth.service';
import { validatePasscode } from '../common/passcode.util';

const parsePayAmountToCents = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BadRequestException('payAmount must be a valid number');
    }
    return Math.round(value * 100);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed.replace(/[$,]/g, ''));
    if (!Number.isFinite(numeric)) {
      throw new BadRequestException('payAmount must be a valid number');
    }
    return Math.round(numeric * 100);
  }

  throw new BadRequestException('payAmount must be a number');
};

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
      payAmount?: number | string | null;
      modules?: unknown;
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
    if (!validatePasscode(passcode)) {
      throw new BadRequestException('passcode must be exactly 4 digits');
    }

    const modules = Array.isArray(body.modules)
      ? body.modules.filter((value): value is string => typeof value === 'string')
      : undefined;

    const employee = await this.employeesService.createForProperty(propertyId, {
      firstName,
      lastName,
      passcode,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      payType: body.payType?.trim().toLowerCase() || null,
      status: body.status?.trim().toLowerCase() || null,
      payAmountCents: parsePayAmountToCents(body.payAmount),
      modules,
    });

    return employee;
  }

  @Patch(':employeeId')
  async update(
    @Req() req: Request,
    @Param('employeeId') employeeId: string,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      payType?: string;
      status?: string;
      payAmount?: number | string | null;
      passcode?: string;
      modules?: unknown;
    },
  ) {
    const deviceToken = req.cookies?.device_session;
    const adminToken = req.cookies?.admin_session;
    const { propertyId } = await this.adminAuth.requireAdmin(deviceToken, adminToken);

    const modules = Array.isArray(body.modules)
      ? body.modules.filter((value): value is string => typeof value === 'string')
      : body.modules === null
        ? []
        : undefined;

    const normalized = {
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
      email: body.email?.trim(),
      phone: body.phone?.trim(),
      payType: body.payType?.trim().toLowerCase(),
      status: body.status?.trim().toLowerCase(),
      payAmountCents: parsePayAmountToCents(body.payAmount),
      passcode: body.passcode?.trim(),
      modules,
    };

    if (normalized.payType && !['hourly', 'weekly', 'annually'].includes(normalized.payType)) {
      normalized.payType = undefined;
    }
    if (normalized.status && !['active', 'inactive'].includes(normalized.status)) {
      normalized.status = undefined;
    }

    if (normalized.firstName === '') {
      throw new BadRequestException('firstName cannot be empty');
    }
    if (normalized.lastName === '') {
      throw new BadRequestException('lastName cannot be empty');
    }

    return this.employeesService.updateForProperty(propertyId, employeeId, normalized);
  }

  @Get('modules')
  async getModules(@Req() req: Request) {
    const deviceToken = req.cookies?.device_session;
    const adminToken = req.cookies?.admin_session;
    const { propertyId } = await this.adminAuth.requireAdmin(deviceToken, adminToken);
    return this.employeesService.getPropertyModules(propertyId);
  }

  @Put('modules')
  async setModules(
    @Req() req: Request,
    @Body() body: { modules?: unknown },
  ) {
    const deviceToken = req.cookies?.device_session;
    const adminToken = req.cookies?.admin_session;
    const { propertyId } = await this.adminAuth.requireAdmin(deviceToken, adminToken);

    const modules = Array.isArray(body.modules)
      ? body.modules.filter((value): value is string => typeof value === 'string')
      : body.modules === null
        ? []
        : undefined;

    if (!modules) {
      throw new BadRequestException('modules must be an array or null to reset');
    }

    return this.employeesService.updatePropertyModules(propertyId, modules);
  }
}
