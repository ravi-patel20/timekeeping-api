import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { hashPasscode, verifyPasscode, validatePasscode } from '../common/passcode.util';
import { ALL_MODULE_KEYS, ensureBaseModules, normalizeModuleKeys } from '../constants/modules';

const prisma = new PrismaClient();
const DEFAULT_PROPERTY_MODULES = ensureBaseModules(ALL_MODULE_KEYS);

@Injectable()
export class EmployeesService {
  private sanitizePropertyModules(modules?: readonly unknown[]): string[] {
    const normalized = normalizeModuleKeys(modules);
    return ensureBaseModules(normalized);
  }

  private sanitizeEmployeeModules(
    modules: readonly unknown[] | undefined | null,
    allowed: readonly unknown[],
  ): string[] {
    const normalized = ensureBaseModules(normalizeModuleKeys(modules));
    const allowedNormalized = ensureBaseModules(normalizeModuleKeys(allowed));
    const allowedSet = new Set<string>(allowedNormalized);
    return normalized.filter((module) => allowedSet.has(module));
  }

  private mapEmployeeModules(modules: { moduleKey: string }[]): string[] {
    return ensureBaseModules(normalizeModuleKeys(modules.map((m) => m.moduleKey)));
  }

  private async fetchPropertyModules(propertyId: string): Promise<string[]> {
    const records = await prisma.propertyModule.findMany({
      where: { propertyId },
      select: { moduleKey: true },
    });
    const modules = normalizeModuleKeys(records.map((m) => m.moduleKey));
    return modules.length ? ensureBaseModules(modules) : DEFAULT_PROPERTY_MODULES;
  }

  async getPropertyModules(propertyId: string): Promise<string[]> {
    return this.fetchPropertyModules(propertyId);
  }

  async updatePropertyModules(propertyId: string, modules: readonly string[] | null | undefined): Promise<string[]> {
    const sanitized = this.sanitizePropertyModules(modules ?? undefined);

    await prisma.$transaction(async (tx) => {
      await tx.propertyModule.deleteMany({
        where: {
          propertyId,
          moduleKey: { notIn: sanitized },
        },
      });

      await tx.propertyModule.createMany({
        data: sanitized.map((moduleKey) => ({ propertyId, moduleKey })),
        skipDuplicates: true,
      });

      await tx.employeeModule.deleteMany({
        where: {
          employee: { propertyId },
          moduleKey: { notIn: sanitized },
        },
      });
    });

    return sanitized;
  }

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
    const employees = await prisma.employee.findMany({
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
        modules: {
          select: { moduleKey: true },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return employees.map((employee) => ({
      ...employee,
      modules: this.mapEmployeeModules(employee.modules),
    }));
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
    modules?: string[] | null;
  }) {
    if (!validatePasscode(data.passcode)) {
      throw new BadRequestException('Passcode must be exactly 4 digits.');
    }

    await this.ensureUniquePasscode(propertyId, data.passcode);

    const propertyModules = await this.fetchPropertyModules(propertyId);
    const employeeModules = this.sanitizeEmployeeModules(data.modules ?? null, propertyModules);
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

      if (employeeModules.length > 0) {
        await tx.employeeModule.createMany({
          data: employeeModules.map((moduleKey) => ({ employeeId: created.id, moduleKey })),
          skipDuplicates: true,
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
              payType: true,
              effectiveAt: true,
              createdAt: true,
            },
            orderBy: { effectiveAt: 'desc' },
          },
          modules: {
            select: { moduleKey: true },
          },
        },
      });

      if (!full) {
        throw new NotFoundException('Employee not found after creation');
      }

      return {
        ...full,
        modules: this.mapEmployeeModules(full.modules),
      };
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
      modules?: string[] | null;
    },
  ) {
    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, propertyId },
    });

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    const propertyModules = await this.fetchPropertyModules(propertyId);
    const modulesToApply = data.modules !== undefined
      ? this.sanitizeEmployeeModules(data.modules ?? null, propertyModules)
      : undefined;

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

      if (modulesToApply) {
        await tx.employeeModule.deleteMany({
          where: {
            employeeId,
            moduleKey: { notIn: modulesToApply },
          },
        });

        const existingModules = await tx.employeeModule.findMany({
          where: { employeeId },
          select: { moduleKey: true },
        });
        const existingSet = new Set(existingModules.map((m) => m.moduleKey));
        const toInsert = modulesToApply.filter((module) => !existingSet.has(module));
        if (toInsert.length > 0) {
          await tx.employeeModule.createMany({
            data: toInsert.map((moduleKey) => ({ employeeId, moduleKey })),
            skipDuplicates: true,
          });
        }
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
          modules: {
            select: { moduleKey: true },
          },
        },
      });

      if (!full) {
        throw new NotFoundException('Employee not found after update');
      }

      return {
        ...full,
        modules: this.mapEmployeeModules(full.modules),
      };
    });

    return updated;
  }
}
