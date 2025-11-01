import { z } from "zod";

/** Line items */
export const InvoiceItemSchema = z.object({
  name: z.string().min(1, "Item name required"),
  quantity: z.number().positive("Quantity must be > 0"),
  unitPrice: z.number().nonnegative("Unit price must be ≥ 0"),
});

/** Create invoice: allow either customerId OR a customer object */
export const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1).optional(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    countryCode: z.string().length(2).optional(),
    isBusiness: z.boolean().optional(),
    vatId: z.string().optional(),
  }).optional(),

  currency: z.string().length(3),
  items: z.array(InvoiceItemSchema).min(1),

  taxReason: z.enum(["domestic", "export_zero", "reverse_charge"]).optional(),
  notes: z.string().max(255).optional(),
  dueDate: z.string().datetime().optional(),
  paymentMethod: z.enum(["BANK_TRANSFER", "CASH", "CARD", "OTHER"]).optional(),
}).refine(d => !!d.customerId || !!d.customer, {
  message: "Provide customerId or customer",
  path: ["customerId"],
});

/** List invoices query */
export const ListInvoicesQuery = z.object({
  status: z.enum(["PAID", "UNPAID"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Mark paid body */
export const MarkPaidSchema = z.object({
  paidAt: z.string().datetime().optional(),
});

/** Route params */
export const InvoiceIdParam = z.object({
  invoiceId: z.string().min(1),
});


export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;
export type ListInvoicesDto  = z.infer<typeof ListInvoicesQuery>;
export type MarkPaidDto      = z.infer<typeof MarkPaidSchema>;
export type InvoiceItemDto   = z.infer<typeof InvoiceItemSchema>;