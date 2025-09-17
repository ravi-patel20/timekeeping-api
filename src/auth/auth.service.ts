import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  private readonly sessionTtlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly adminSessionTtlMs = 12 * 60 * 60 * 1000; // 12 hours

  async sendMagicLink(propertyId: string, deviceId: string) {
    const property = await prisma.property.findUnique({
      where: { code: propertyId },
    });

    if (!property) throw new Error('Invalid property ID');

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.magicLink.create({
      data: {
        propertyId: property.id,
        deviceId,
        token,
        expiresAt,
      },
    });

    const link = `${process.env.MAGIC_LINK_SUCCESS_BASE_URL}?token=${token}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: property.email,
      subject: 'Your Clock-In Login Link',
      html: `<p>Click <a href="${link}">here</a> to log in.</p>`,
    }).then((data) => {
      console.log('Email sent:', data);
      console.log('Magic link sent successfully');
    }).catch((error) => {
      console.error('Error sending magic link:', error);
    });

    return { success: true };
  }

  async verifyToken(token: string) {
    const link = await prisma.magicLink.findUnique({ where: { token } });
    if (!link || link.expiresAt < new Date()) {
      return { verified: false };
    }

    await prisma.magicLink.update({
      where: { token },
      data: { verified: true },
    });

    return { verified: true };
  }

  async checkVerification(deviceId: string) {
    const latest = await prisma.magicLink.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest || !latest.verified) return { verified: false };

    // Create or reuse a device session for this device/property
    const now = new Date();
    let session = await prisma.deviceSession.findFirst({
      where: {
        deviceId,
        propertyId: latest.propertyId,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      session = await prisma.deviceSession.create({
        data: {
          token: randomUUID(),
          deviceId,
          propertyId: latest.propertyId,
          expiresAt: new Date(Date.now() + this.sessionTtlMs),
        },
      });
    }

    return {
      verified: true,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }

  async getSession(sessionToken: string | undefined) {
    if (!sessionToken) return { active: false };
    const now = new Date();
    const session = await prisma.deviceSession.findFirst({
      where: { token: sessionToken, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) return { active: false };
    const property = await prisma.property.findUnique({ where: { id: session.propertyId } });
    return {
      active: true,
      propertyId: session.propertyId,
      propertyCode: property?.code,
      expiresAt: session.expiresAt,
    };
  }

  async revokeSession(sessionToken: string | undefined) {
    if (!sessionToken) return { revoked: false };
    try {
      await prisma.deviceSession.deleteMany({ where: { token: sessionToken } });
      return { revoked: true };
    } catch {
      return { revoked: false };
    }
  }

  async identifyEmployee(sessionToken: string | undefined, passcode: string) {
    if (!sessionToken) return null;
    const now = new Date();
    const session = await prisma.deviceSession.findFirst({
      where: { token: sessionToken, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!session) return null;

    const employee = await prisma.employee.findFirst({
      where: {
        propertyId: session.propertyId,
        passcode,
      },
    });
    if (!employee) return null;

    if ((employee as any).isAdmin) {
      // Create admin session to avoid repeatedly sending passcode
      const admin = await prisma.adminSession.create({
        data: {
          token: randomUUID(),
          propertyId: session.propertyId,
          employeeId: employee.id,
          expiresAt: new Date(Date.now() + this.adminSessionTtlMs),
        },
      });
      return {
        employeeId: employee.id,
        name: employee.name,
        isAdmin: true,
        adminToken: admin.token,
        adminExpiresAt: admin.expiresAt,
      };
    }

    return { employeeId: employee.id, name: employee.name, isAdmin: false };
  }
}
