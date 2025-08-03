import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-magic-link')
  requestLink(@Body() body: { email: string; deviceId: string }) {
    return this.authService.sendMagicLink(body.email, body.deviceId);
  }

  @Get('verify')
  verify(@Query('token') token: string) {
    return this.authService.verifyToken(token);
  }

  @Get('poll-status')
  poll(@Query('deviceId') deviceId: string) {
    return this.authService.checkVerification(deviceId);
  }
}
