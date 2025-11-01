import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { makeAccountFromJWT } from './appwrite';
import APIResponse from '../utils/APIResponse';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email?: string | null; name?: string | null };
    appwrite?: {
      client: ReturnType<typeof makeAccountFromJWT>['client'];
      account: ReturnType<typeof makeAccountFromJWT>['account'];
    };
  }
}

/**
 * Fastify authentication guard for Appwrite JWTs.
 * 
 * - Extracts JWT from Authorization header
 * - Validates token using Appwrite Account.get()
 * - Populates req.user and req.appwrite for downstream handlers
 * 
 * Throws 401 on missing or invalid token.
 */
const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authGuard', async (req, reply) => {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim(); // Extract token
    if (!token) {
      return APIResponse.error(reply, 'Missing token', 401);
    }

    // Validate token and fetch user info
    try {
      const { account, client } = makeAccountFromJWT(token);
      const me = await account.get();
      req.user = { 
        id: me.$id, email: (me as any).email ?? null,
        name: (me as any).name ?? null
      };

      req.appwrite = {
        client,
        account,
      };
    } catch {
      return APIResponse.error(reply, 'Invalid or expired token', 401);
    }
  });
};

export default fp(plugin, { name: 'require-appwrite-auth' });

declare module 'fastify' {
  interface FastifyInstance {
    authGuard: (req: any, reply: any) => Promise<void>;
  }
}
