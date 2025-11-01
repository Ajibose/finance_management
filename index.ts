import { buildApp } from './src/app';
import { env } from './src/config/env';

const app = buildApp();
app
  .listen({ port: env.PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`API listening on :${env.PORT}`))
  .catch((err) => {
    app.log.fatal(err, 'Failed to start server');
    process.exit(1);
  });
