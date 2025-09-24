import serverlessExpress from '@vendia/serverless-express';
import { createApp } from '../src/main';

let cached: ReturnType<typeof serverlessExpress> | null = null;

const bootstrap = async () => {
  const app = await createApp();
  await app.init();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
};

export default async function handler(req: any, res: any) {
  if (!cached) {
    cached = await bootstrap();
  }
  return cached(req, res);
}
