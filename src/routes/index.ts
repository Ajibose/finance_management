import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const routes: FastifyPluginAsync = async (app) => {
  app.get('/auth/me', { preHandler: app.authGuard }, async (req) => {
    return {
      id: req.user!.id,
      email: req.user!.email ?? undefined,
      name: req.user!.name ?? undefined,
    };
    return { message: 'This endpoint is under construction' };
  });
};

export default routes;