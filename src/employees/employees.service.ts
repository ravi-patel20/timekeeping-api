import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { hashPasscode, verifyPasscode, validatePasscode } from '../common/passcode.util';

const prisma = new PrismaClient();

@Injectable()
export class EmployeesService {
  private async ensureUniquePasscode(propertyId: string, passcode: string, excludeEmployeeId?: string) {
    const clashes = await prisma.employee.findMany({
      where: {
        propertyId,
        ...(excludeEmployeeId ? { NOT: { id: excludeEmployeeId } } : {}),
      },
      select: { id: true, passcodeHash: true },
    });

    const conflict = clashes.find((emp) => verifyPasscode(passcode, emp.passcodeHash));
    if (conflict) {
      throw new BadRequestException('Passcode already in use. Choose a different 4-digit code.');
    }
  }

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
        payAmountCents: true,
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
    payAmountCents?: number | null;
  }) {
    if (!validatePasscode(data.passcode)) {
      throw new BadRequestException('Passcode must be exactly 4 digits.');
    }

    await this.ensureUniquePasscode(propertyId, data.passcode);

    const hashedPasscode = hashPasscode(data.passcode);

    const employee = await prisma.$transaction(async (tx) => {
      const initialPayType = data.payType ?? 'hourly';

      const created = await tx.employee.create({
        data: {
          propertyId,
          firstName: data.firstName,
          lastName: data.lastName,
          passcodeHash: hashedPasscode,
          email: data.email ?? null,
          phone: data.phone ?? null,
          payType: initialPayType,
          payAmountCents: data.payAmountCents ?? null,
          status: data.status ?? 'active',
          isAdmin: false,
        },
        select: { id: true },
      });

      await tx.employeePayHistory.create({
        data: {
          employeeId: created.id,
          amountCents: data.payAmountCents ?? null,
          payType: initialPayType,
        },
      });

      const full = await tx.employee.findUnique({
        where: { id: created.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          payType: true,
          payAmountCents: true,
          status: true,
          isAdmin: true,
          payHistory: {
            select: {
              id: true,
              amountCents: true,
              payType: true,
              effectiveAt: true,
              createdAt: true,
            },
            orderBy: { effectiveAt: 'desc' },
          },
        },
      });

      return full!;
    });

    return employee;
  }

  async updateForProperty(
    propertyId: string,
    employeeId: string,
    data: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      payType?: string | null;
      status?: string | null;
      payAmountCents?: number | null;
      passcode?: string | null;
    },
  ) {
    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, propertyId },
    });

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    const updateData: Record<string, any> = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName ?? existing.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName ?? existing.lastName;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.status !== undefined) updateData.status = data.status || existing.status;

    if (data.passcode !== undefined) {
      if (!data.passcode) {
        throw new BadRequestException('Passcode cannot be empty.');
      }
      if (!validatePasscode(data.passcode)) {
        throw new BadRequestException('Passcode must be exactly 4 digits.');
      }
      await this.ensureUniquePasscode(propertyId, data.passcode, employeeId);
      updateData.passcodeHash = hashPasscode(data.passcode);
    }
    let payTypeChanged = false;
    let nextPayType = existing.payType;
    if (data.payType !== undefined) {
      const normalized = data.payType ?? existing.payType;
      updateData.payType = normalized;
      if (normalized !== existing.payType) {
        payTypeChanged = true;
      }
      nextPayType = normalized;
    }
    let payAmountChanged = false;
    let nextPayAmount = existing.payAmountCents ?? null;
    if (data.payAmountCents !== undefined) {
      const normalized = data.payAmountCents ?? null;
      if (normalized !== existing.payAmountCents) {
        updateData.payAmountCents = normalized;
        payAmountChanged = true;
        nextPayAmount = normalized;
      }
    }
    if (!payAmountChanged) {
      nextPayAmount = existing.payAmountCents ?? null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.employee.update({
          where: { id: employeeId },
          data: updateData,
        });
      }

      if (payAmountChanged || payTypeChanged) {
        await tx.employeePayHistory.create({
          data: {
            employeeId,
            amountCents: nextPayAmount,
            payType: nextPayType,
          },
        });
      }

      const full = await tx.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          payType: true,
          payAmountCents: true,
          status: true,
          isAdmin: true,
          payHistory: {
            select: {
              id: true,
              amountCents: true,
              payType: true,
              effectiveAt: true,
              createdAt: true,
            },
            orderBy: { effectiveAt: 'desc' },
          },
        },
      });

      return full!;
    });

    return updated;
  }
}
