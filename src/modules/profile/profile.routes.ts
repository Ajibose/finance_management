import type { FastifyPluginAsync } from "fastify";
import APIResponse from "../../utils/APIResponse";
import validate from "../../middleware/validate";
import { AppwriteRepo } from "../../adapters/appwriteAdapter";
import { ProfileService } from "./profile.service";
import { ProfileDto, VatSettingsDto } from "./profile.schema";

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authGuard);

  const repo = new AppwriteRepo(fastify.db);
  const svc = new ProfileService(repo);

  /* GET /profile - Get Profile */
  fastify.get("/", async (req, reply) => {
    const profile = await svc.getProfile(req.user!.id);
    return APIResponse.success(reply, profile);
  });

  /* POST /profile - Create/Update Profile */
  fastify.post(
    "/",
    { preHandler: [validate.body(ProfileDto)] },
    async (req, reply) => {
      const profile = await svc.upsertProfile(req.user!.id, req.body as ProfileDto);
      return APIResponse.success(reply, profile, "Profile saved");
    }
  );

    /* GET /profile/vat - Get VAT Settings */
  fastify.get("/vat", async (req, reply) => {
    try {
      const vat = await svc.getVatSettings(req.user!.id);
      return APIResponse.success(reply, vat);
    } catch (err: any) {
      return APIResponse.error(reply, err.message, 400);
    }
  });

  /* POST /profile/vat - Create/Update VAT Settings */
  fastify.post(
    "/vat",
    { preHandler: [validate.body(VatSettingsDto)] },
    async (req, reply) => {
      const vat = await svc.upsertVatSettings(req.user!.id, req.body as VatSettingsDto);
      return APIResponse.success(reply, vat, "VAT settings saved");
    }
  );
};

export default routes;
