import { env } from '../config/env';
import type { FastifyServerOptions } from 'fastify';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let transport: any = undefined;
if (env.NODE_ENV === 'development') {
  try {
    const target = resolve(__dirname, '../../node_modules/pino-pretty');
    transport = {
      target,
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  } catch {
    console.warn('[logger] pino-pretty not found, using plain logs');
  }
}

export const loggerOptions: FastifyServerOptions['logger'] = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: ['req.headers.authorization'],
  transport,
};
