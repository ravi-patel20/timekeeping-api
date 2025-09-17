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
        name: true,
        isAdmin: true,
        email: true,
        phone: true,
        payType: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
