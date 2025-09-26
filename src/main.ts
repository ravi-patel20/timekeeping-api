import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

export const createApp = async (): Promise<INestApplication> => {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:8080',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  return app;
};

async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

if (require.main === module) {
  bootstrap();
}
