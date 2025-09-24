import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/main';

let app: INestApplication | null = null;
let handler: ((req: VercelRequest, res: VercelResponse) => void) | null = null;

async function ensureHandler() {
  if (!handler) {
    app = await createApp();
    await app.init();
    handler = app.getHttpAdapter().getInstance();
  }
}

export default async function vercelHandler(req: VercelRequest, res: VercelResponse) {
  await ensureHandler();
  return handler!(req, res);
}
