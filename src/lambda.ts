import serverlessExpress from '@codegenie/serverless-express';
import { createApp } from './bootstrap';

type LambdaHandler = (
  event: unknown,
  context: unknown,
  callback?: unknown,
) => Promise<unknown>;

let cachedServer: LambdaHandler;

async function getServer(): Promise<LambdaHandler> {
  if (!cachedServer) {
    const app = await createApp();
    cachedServer = serverlessExpress({
      app: app.getHttpAdapter().getInstance(),
    });
  }

  return cachedServer;
}

export const handler: LambdaHandler = async (event, context, callback) => {
  const server = await getServer();
  return server(event, context, callback);
};
