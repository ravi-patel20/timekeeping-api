import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient, ClockType } from '@prisma/client';
import { startOfDay } from 'date-fns';
import { hashPasscode, isLegacyPasscode, verifyPasscode } from '../common/passcode.util';

const prisma = new PrismaClient();

@Injectable()
export class ClockService {
  async clockActionWithSession(sessionToken: string | undefined, passcode: string, action: 'IN' | 'OUT') {
    const propertyId = await this.propertyIdFromSession(sessionToken);
    if (!propertyId) return null;

    const employee = await this.findEmployeeByPasscode(propertyId, passcode);

    if (!employee) return null;

    const lastLog = await prisma.clockLog.findFirst({
      where: { employeeId: employee.id },
      orderBy: { timestamp: 'desc' },
    });

    // Validation: prevent duplicate actions and out-before-in
    if (action === 'IN') {
      if (lastLog?.type === 'IN') {
        throw new BadRequestException('Already clocked in. Please clock out first.');
      }
    } else if (action === 'OUT') {
      if (!lastLog || lastLog.type !== 'IN') {
        throw new BadRequestException('Cannot clock out before clocking in.');
      }
    }

    const log = await prisma.clockLog.create({
      data: {
        employeeId: employee.id,
        type: action as ClockType,
      },
    });

    const hoursWorked = await this.calculateHoursWorked(employee.id);

    return { success: true, type: log.type, timestamp: log.timestamp, hoursWorked };
  }

  async clockWithSession(sessionToken: string | undefined, passcode: string) {
    const propertyId = await this.propertyIdFromSession(sessionToken);
    if (!propertyId) return null;

    const employee = await this.findEmployeeByPasscode(propertyId, passcode);

    if (!employee) return null;

    const lastLog = await prisma.clockLog.findFirst({
      where: { employeeId: employee.id },
      orderBy: { timestamp: 'desc' },
    });

    const newType = lastLog?.type === 'IN' ? 'OUT' : 'IN';

    const log = await prisma.clockLog.create({
      data: {
        employeeId: employee.id,
        type: newType as ClockType,
      },
    });

    const hoursWorked = await this.calculateHoursWorked(employee.id);

    return { success: true, type: log.type, timestamp: log.timestamp, hoursWorked };
  }

  async getStatusWithSession(sessionToken: string | undefined, passcode: string) {
    const propertyId = await this.propertyIdFromSession(sessionToken);
    if (!propertyId) return null;

    const employee = await this.findEmployeeByPasscode(propertyId, passcode);

    if (!employee) return null;

    const lastLog = await prisma.clockLog.findFirst({
      where: { employeeId: employee.id },
      orderBy: { timestamp: 'desc' },
    });

    const nextAction = lastLog?.type === 'IN' ? 'Clock Out' : 'Clock In';
    const currentStatus = lastLog?.type ?? 'OUT';
    const hoursWorked = await this.calculateHoursWorked(employee.id);

    return { nextAction, hoursWorked, currentStatus };
  }

  async getTodayLogsWithSession(sessionToken: string | undefined, passcode: string) {
    const propertyId = await this.propertyIdFromSession(sessionToken);
    if (!propertyId) return null;

    const employee = await this.findEmployeeByPasscode(propertyId, passcode);

    if (!employee) return null;

    const start = startOfDay(new Date());
    const logs = await prisma.clockLog.findMany({
      where: {
        employeeId: employee.id,
        timestamp: { gte: start },
      },
      orderBy: { timestamp: 'desc' },
    });

    return logs.map(l => ({ id: l.id, type: l.type, timestamp: l.timestamp }));
  }

  private async calculateHoursWorked(employeeId: string): Promise<number> {
    const startOfToday = startOfDay(new Date());

    const logs = await prisma.clockLog.findMany({
      where: {
        employeeId,
        timestamp: {
          gte: startOfToday,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    let totalHours = 0;
    for (let i = 0; i < logs.length; i += 2) {
      const clockIn = logs[i];
      const clockOut = logs[i + 1];
      if (clockIn && clockOut) {
        totalHours += (clockOut.timestamp.getTime() - clockIn.timestamp.getTime()) / (1000 * 60 * 60);
      }
    }

    return totalHours;
  }

  private async propertyIdFromSession(sessionToken: string | undefined): Promise<string | null> {
    if (!sessionToken) return null;
    const session = await prisma.deviceSession.findFirst({
      where: {
        token: sessionToken,
        expiresAt: { gt: new Date() },
      },
    });
    return session?.propertyId ?? null;
  }

  private async findEmployeeByPasscode(propertyId: string, passcode: string) {
    const employees = await prisma.employee.findMany({
      where: { propertyId },
      select: {
        id: true,
        passcodeHash: true,
      },
    });

    for (const candidate of employees) {
      if (verifyPasscode(passcode, candidate.passcodeHash)) {
        if (isLegacyPasscode(candidate.passcodeHash)) {
          const upgradedHash = hashPasscode(passcode);
          await prisma.employee.update({
            where: { id: candidate.id },
            data: { passcodeHash: upgradedHash },
          });
          return { ...candidate, passcodeHash: upgradedHash };
        }
        return candidate;
      }
    }

    return null;
  }
}
