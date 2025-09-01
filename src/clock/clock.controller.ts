import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ClockService } from './clock.service';

@Controller('clock')
export class ClockController {
  constructor(private readonly clockService: ClockService) {}

  @Post()
  async clock(@Body() body: { deviceId?: string, passcode: string }, @Req() req: Request) {
    const token = (req.cookies?.device_session) || (req.headers['authorization']?.toString().startsWith('Bearer ') ? req.headers['authorization']!.toString().slice(7) : undefined);
    const result = await this.clockService.clockWithSession(token, body.passcode);
    if (!result) throw new UnauthorizedException('Unauthorized or Invalid Passcode');
    return result;
  }

  @Get('status')
  async getStatus(@Body() body: { deviceId?: string, passcode: string }, @Req() req: Request) {
    const token = (req.cookies?.device_session) || (req.headers['authorization']?.toString().startsWith('Bearer ') ? req.headers['authorization']!.toString().slice(7) : undefined);
    const result = await this.clockService.getStatusWithSession(token, body.passcode);
    if (!result) throw new UnauthorizedException('Unauthorized or Invalid Passcode');
    return result;
  }
}
