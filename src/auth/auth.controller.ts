import { Controller, Get, Post, Query, Body, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-magic-link')
  requestLink(@Body() body: { propertyId: string, deviceId: string }) {
    return this.authService.sendMagicLink(body.propertyId, body.deviceId);
  }

  @Get('verify')
  async verify(@Query('token') token: string, @Res() res: Response) {
    const result = await this.authService.verifyToken(token);
    const redirectBase = process.env.FRONTEND_REDIRECT_URL;
    if (redirectBase) {
      const sep = redirectBase.includes('?') ? '&' : '?';
      const url = `${redirectBase}${sep}verified=${result.verified ? 'true' : 'false'}`;
      return res.redirect(url);
    }
    return res.json(result);
  }

  @Get('poll-status')
  async poll(@Query('deviceId') deviceId: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.checkVerification(deviceId);

    if (result.verified && result.token && result.expiresAt) {
      const expiresAt = new Date(result.expiresAt);
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('device_session', result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        expires: expiresAt,
        // domain: process.env.COOKIE_DOMAIN, // optionally set via env if needed
        path: '/',
      });
    }

    return result;
  }

  @Get('session')
  async session(@Req() req: Request) {
    const token = (req.cookies?.device_session) || (req.headers['authorization']?.toString().startsWith('Bearer ') ? req.headers['authorization']!.toString().slice(7) : undefined);
    return this.authService.getSession(token);
  }
}
