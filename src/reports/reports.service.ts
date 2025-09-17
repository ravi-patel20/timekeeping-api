import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EmployeeClockEntryDto {
  id: string;
  type: 'IN' | 'OUT';
  timestamp: Date;
}

export interface EmployeeHoursSummary {
  id: string;
  name: string;
  isAdmin: boolean;
  totalHours: number;
  clockEntries: EmployeeClockEntryDto[];
  email: string | null;
  phone: string | null;
  payType: string;
  status: string;
}

@Injectable()
export class ReportsService {
  private clampDate(d: Date, start: Date, end: Date) {
    return new Date(Math.min(Math.max(d.getTime(), start.getTime()), end.getTime()));
  }

  private async calculateHoursAndLogsInRange(
    employeeId: string,
    start: Date,
    end: Date,
  ): Promise<{ hours: number; logs: EmployeeClockEntryDto[] }> {
    if (end <= start) {
      return { hours: 0, logs: [] };
    }
    const [lastBefore, logs] = await Promise.all([
      prisma.clockLog.findFirst({
        where: { employeeId, timestamp: { lt: start } },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.clockLog.findMany({
        where: { employeeId, timestamp: { gte: start, lte: end } },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    let totalMs = 0;
    let openIn: Date | null = null;

    if (lastBefore?.type === 'IN') {
      openIn = start; // carry-over
    }

    for (const log of logs) {
      const t = this.clampDate(log.timestamp, start, end);
      if (log.type === 'IN') {
        if (!openIn) openIn = t;
      } else if (log.type === 'OUT') {
        if (openIn) {
          totalMs += t.getTime() - openIn.getTime();
          openIn = null;
        }
      }
    }

    if (openIn) {
      totalMs += end.getTime() - openIn.getTime();
    }

    const normalizedLogs: EmployeeClockEntryDto[] = logs.map((log) => ({
      id: log.id,
      type: log.type,
      timestamp: log.timestamp,
    }));

    return {
      hours: totalMs / (1000 * 60 * 60),
      logs: normalizedLogs,
    };
  }

  async employeesWithHours(propertyId: string, startIso: string | undefined, endIso: string | undefined): Promise<EmployeeHoursSummary[]> {
    if (!startIso || !endIso) throw new BadRequestException('start and end are required (ISO date strings)');
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new BadRequestException('Invalid start or end date');

    const employees = await prisma.employee.findMany({
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

    const results: EmployeeHoursSummary[] = [];
    for (const e of employees) {
      const { hours, logs } = await this.calculateHoursAndLogsInRange(e.id, start, end);
      results.push({
        id: e.id,
        name: e.name,
        isAdmin: e.isAdmin,
        totalHours: Number(hours.toFixed(2)),
        clockEntries: logs,
        email: e.email ?? null,
        phone: e.phone ?? null,
        payType: e.payType,
        status: e.status,
      });
    }
    return results;
  }
}
