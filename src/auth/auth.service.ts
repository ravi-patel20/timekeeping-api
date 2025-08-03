import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);
const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  async sendMagicLink(email: string, deviceId: string) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.magicLink.create({
      data: { email, deviceId, token, expiresAt },
    });

    const link = `${process.env.FRONTEND_REDIRECT_URL}?token=${token}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: 'Your Magic Link',
      html: `<p>Click <a href="${link}">here</a> to log in.</p>`,
    });;

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

    if (!latest) return { verified: false };

    return { verified: latest.verified };
  }
}
