import type { FastifyPluginAsync } from "fastify";
import APIResponse from "../../utils/APIResponse";
import validate from "../../middleware/validate";
import { AppwriteRepo } from "../../adapters/appwriteAdapter";
import { InvoiceService } from "./invoices.service";
import {
  CreateInvoiceSchema,
  ListInvoicesQuery,
  MarkPaidSchema,
  InvoiceIdParam,
} from "./invoices.schema";

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authGuard);

  const repo = new AppwriteRepo(fastify.db);
  const svc  = new InvoiceService(repo);

  /* POST /invoices - Create Invoice */
  fastify.post(
    "/",
    { preHandler: [validate.body(CreateInvoiceSchema)] },
    async (req, reply) => {
      const invoice = await svc.create(req.user!.id, req.body as any);
      return APIResponse.created(reply, "Invoice created", invoice);
    }
  );

  /* GET /invoices - List Invoices */
  fastify.get(
    "/",
    { preHandler: [validate.query(ListInvoicesQuery)] },
    async (req, reply) => {
      const data = await svc.list(req.user!.id, req.query as any);
      return APIResponse.success(reply, data);
    }
  );

  /* GET /invoices/:invoiceId - Get Invoice by ID */
  fastify.get(
    "/:invoiceId",
    { preHandler: [validate.params(InvoiceIdParam)] },
    async (req, reply) => {
        const { invoiceId } = req.params as any;
        const invoice = await svc.getById(req.user!.id, invoiceId);
        return APIResponse.success(reply, invoice);
    }
  );

  /* PATCH /invoices/:invoiceId/paid - Mark Invoice as Paid */
  fastify.patch(
    "/:invoiceId/paid",
    { preHandler: [validate.params(InvoiceIdParam), validate.body(MarkPaidSchema)] },
    async (req, reply) => {
      const { invoiceId } = req.params as any;
      const updated = await svc.markPaid(req.user!.id, invoiceId, req.body as any);
      return APIResponse.success(reply, updated, "Invoice marked as paid");
    }
  );
};

export default routes;
