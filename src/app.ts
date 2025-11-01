import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import routes from './routes';
import { env } from './config/env';
import requireAppwriteAuth from './plugins/requireAppwriteAuth';
import appwritePlugin from "./plugins/appwrite";
import { loggerOptions } from './plugins/logger';

export function buildApp() {
  const app = Fastify({ logger: loggerOptions });

  app.register(helmet);
  app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    credentials: true,
  });

  // Auth plugin
  app.register(requireAppwriteAuth);
  app.register(appwritePlugin);

  // API routes
  app.register(routes, { prefix: '/api/v1' });

  // Global error handler (sanitized)
  app.setErrorHandler((err, _req, reply) => {
    const status = (err as any).statusCode ?? 500;
    const message = status === 500 ? 'Internal Server Error' : err.message;
    app.log.error({ err }, 'UnhandledError');
    reply.code(status).send({ success: false, error: { code: status, message } });
  });

  return app;
}
