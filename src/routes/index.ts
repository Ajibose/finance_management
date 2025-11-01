import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import invoiceRoutes from '../modules/invoices/invoices.routes';
import profileRoutes from '../modules/profile/profile.routes';

const routes: FastifyPluginAsync = async (app) => {
  app.register(invoiceRoutes, { prefix: '/invoices' });
  app.register(profileRoutes, { prefix: '/profile' });

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