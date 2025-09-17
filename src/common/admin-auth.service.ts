import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AdminAuthService {
  async requireAdmin(sessionToken: string | undefined, adminToken: string | undefined) {
    if (!sessionToken) throw new UnauthorizedException('Missing device session');
    if (!adminToken) throw new UnauthorizedException('Missing admin session');

    const now = new Date();
    const [session, admin] = await Promise.all([
      prisma.deviceSession.findFirst({ where: { token: sessionToken, expiresAt: { gt: now } } }),
      prisma.adminSession.findFirst({ where: { token: adminToken, expiresAt: { gt: now } } }),
    ]);

    if (!session || !admin) throw new UnauthorizedException('Invalid session');
    if (session.propertyId !== admin.propertyId) throw new UnauthorizedException('Cross-property session');

    const employee = await prisma.employee.findUnique({ where: { id: admin.employeeId } });
    if (!employee || !(employee as any).isAdmin) throw new UnauthorizedException('Not an admin');

    return { propertyId: session.propertyId, adminEmployeeId: employee.id };
  }
}

