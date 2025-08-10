import { Injectable } from '@nestjs/common';
import { PrismaClient, ClockType } from '@prisma/client';
import { startOfDay } from 'date-fns';

const prisma = new PrismaClient();

@Injectable()
export class ClockService {
  async clock(deviceId: string, passcode: string) {
    const link = await prisma.magicLink.findFirst({
      where: { deviceId, verified: true },
      include: { property: true },
    });

    if (!link) return null;

    const employee = await prisma.employee.findFirst({
      where: {
        propertyId: link.propertyId,
        passcode,
      },
    });

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

  async getStatus(deviceId: string, passcode: string) {
    const link = await prisma.magicLink.findFirst({
      where: { deviceId, verified: true },
      include: { property: true },
    });

    if (!link) return null;

    const employee = await prisma.employee.findFirst({
      where: {
        propertyId: link.propertyId,
        passcode,
      },
    });

    if (!employee) return null;

    const lastLog = await prisma.clockLog.findFirst({
      where: { employeeId: employee.id },
      orderBy: { timestamp: 'desc' },
    });

    const nextAction = lastLog?.type === 'IN' ? 'Clock Out' : 'Clock In';
    const hoursWorked = await this.calculateHoursWorked(employee.id);

    return { nextAction, hoursWorked };
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
}
