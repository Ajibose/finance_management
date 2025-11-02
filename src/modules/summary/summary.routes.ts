import type { FastifyPluginAsync } from "fastify";
import APIResponse from "../../utils/APIResponse";
import validate from "../../middleware/validate";
import { AppwriteRepo } from "../../adapters/appwriteAdapter";
import { SummaryService } from "./summary.service";
import { SummaryQuery } from "./summary.schema";

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authGuard);

  const repo = new AppwriteRepo(fastify.db);
  const svc  = new SummaryService(repo);

  // GET /api/v1/summary?from=...&to=...
  fastify.get(
    "/",
    { preHandler: [validate.query(SummaryQuery)] },
    async (req, reply) => {
      const data = await svc.getSummary(req.user!.id, req.query as any);
      return APIResponse.success(reply, data);
    }
  );
};

export default routes;