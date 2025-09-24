import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/main';
import type { INestApplication } from '@nestjs/common';

let app: INestApplication | undefined;

async function bootstrap() {
  app = await createApp();
  await app.init();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) {
    await bootstrap();
  }

  const expressHandler = app!.getHttpAdapter().getInstance();
  return expressHandler(req, res);
}
