import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class EmployeesService {
  async listForProperty(propertyId: string) {
    return prisma.employee.findMany({
      where: { propertyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        email: true,
        phone: true,
        payType: true,
        status: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async createForProperty(propertyId: string, data: {
    firstName: string;
    lastName: string;
    passcode: string;
    email?: string | null;
    phone?: string | null;
    payType?: string | null;
    status?: string | null;
  }) {
    const employee = await prisma.employee.create({
      data: {
        propertyId,
        firstName: data.firstName,
        lastName: data.lastName,
        passcode: data.passcode,
        email: data.email ?? null,
        phone: data.phone ?? null,
        payType: data.payType ?? 'hourly',
        status: data.status ?? 'active',
        isAdmin: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        payType: true,
        status: true,
        isAdmin: true,
      },
    });
    return employee;
  }
}
