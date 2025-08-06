import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ClockModule } from './clock/clock.module';

@Module({
  imports: [AuthModule, ClockModule],
})
export class AppModule {}
