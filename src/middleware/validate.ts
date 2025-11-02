import type { FastifyRequest, FastifyReply } from "fastify";
import type { ZodSchema } from "zod";
import APIResponse from "../utils/APIResponse";

export function body(schema: ZodSchema) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      req.body = schema.parse(req.body);
    } catch (err: any) {
      return APIResponse.error(reply, err.errors?.[0]?.message ?? "Invalid request body", 400);
    }
  };
}

export function query(schema: ZodSchema) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      req.query = schema.parse(req.query);
    } catch (err: any) {
      return APIResponse.error(reply, err.errors?.[0]?.message ?? "Invalid query parameters", 400);
    }
  };
}

export function params(schema: ZodSchema) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      req.params = schema.parse(req.params);
    } catch (err: any) {
      return APIResponse.error(reply, err.errors?.[0]?.message ?? "Invalid route parameters", 400);
    }
  };
}

export default { body, query, params };
