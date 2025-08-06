import { Injectable } from '@nestjs/common';
import { PrismaClient, ClockType } from '@prisma/client';

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

    return { success: true, type: log.type, timestamp: log.timestamp };
  }
}
