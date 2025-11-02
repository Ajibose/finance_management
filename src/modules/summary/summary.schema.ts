import { z } from "zod";

export const SummaryQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  groupBy: z.enum(["day", "month", "year"]).default("month").optional(),
  currency: z.string().length(3).optional(), // filter to a specific currency (e.g., "NGN")
});

export type SummaryQueryDto = z.infer<typeof SummaryQuery>;