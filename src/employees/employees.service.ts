import { Injectable, NotFoundException } from '@nestjs/common';
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
    const employee = await prisma.$transaction(async (tx) => {
      const created = await tx.employee.create({
        data: {
          propertyId,
          firstName: data.firstName,
          lastName: data.lastName,
          passcode: data.passcode,
          email: data.email ?? null,
          phone: data.phone ?? null,
          payType: data.payType ?? 'hourly',
          payAmountCents: data.payAmountCents ?? null,
          status: data.status ?? 'active',
          isAdmin: false,
        },
        select: { id: true },
      });

      if (data.payAmountCents !== undefined && data.payAmountCents !== null) {
        await tx.employeePayHistory.create({
          data: {
            employeeId: created.id,
            amountCents: data.payAmountCents ?? null,
          },
        });
      }

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
    if (data.payType !== undefined) updateData.payType = data.payType || existing.payType;
    if (data.status !== undefined) updateData.status = data.status || existing.status;
    let payAmountChanged = false;
    if (data.payAmountCents !== undefined) {
      const normalized = data.payAmountCents ?? null;
      if (normalized !== existing.payAmountCents) {
        updateData.payAmountCents = normalized;
        payAmountChanged = true;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.employee.update({
          where: { id: employeeId },
          data: updateData,
        });
      }

      if (payAmountChanged) {
        await tx.employeePayHistory.create({
          data: {
            employeeId,
            amountCents: updateData.payAmountCents ?? null,
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
