import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { ClockService } from './clock.service';

@Controller('clock')
export class ClockController {
  constructor(private readonly clockService: ClockService) {}

  @Post()
  async clock(@Body() body: { deviceId: string, passcode: string }) {
    const result = await this.clockService.clock(body.deviceId, body.passcode);
    if (!result) throw new UnauthorizedException('Unauthorized or Invalid Passcode');
    return result;
  }

  @Get('status')
  async getStatus(@Body() body: { deviceId: string, passcode: string }) {
    const result = await this.clockService.getStatus(body.deviceId, body.passcode);
    if (!result) throw new UnauthorizedException('Unauthorized or Invalid Passcode');
    return result;
  }
}
