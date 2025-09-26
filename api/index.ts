import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../dist/main';

let appPromise: Promise<INestApplication> | null = null;

async function getApp(): Promise<INestApplication> {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await createApp();
      await app.init();
      return app;
    })();
  }

  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  const instance = app.getHttpAdapter().getInstance();

  await new Promise<void>((resolve, reject) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    res.once('error', (err) => reject(err as Error));
    instance(req, res);
  });
}
