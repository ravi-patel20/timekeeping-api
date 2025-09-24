import serverlessExpress from '@vendia/serverless-express';
import { createApp } from '../src/main';

let cachedHandler: ReturnType<typeof serverlessExpress> | null = null;

const bootstrap = async () => {
  const app = await createApp();
  await app.init();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
};

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(req, res);
}
