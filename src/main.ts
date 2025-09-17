import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:8080',
    credentials: true, // allow cookies/credentials
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.listen(3000);
}
bootstrap();
