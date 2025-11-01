import { Query } from "node-appwrite";
import { computeVAT, resolveVatRateStrict } from "../../domain/vat";
import type { CreateInvoiceDto, MarkPaidDto, ListInvoicesDto } from "./invoices.schema";
import { AppwriteRepo } from "../../adapters/appwriteAdapter";
import { messaging } from "../../plugins/appwrite";
import { env } from "../../config/env";
import { paginate } from "../../utils/pagination";

const COL_CUSTOMERS = "customers";
const COL_INVOICES = "invoices";
const COL_ITEMS = "invoice_items";

export class InvoiceService {
  constructor(private readonly repo: AppwriteRepo) {}

  async create(userId: string, data: CreateInvoiceDto & { customer?: any }) {
    let customerId = data.customerId;

    if (!customerId && data.customer) {
      const c = data.customer;
      const customer = await this.repo.create(COL_CUSTOMERS, userId, {
        name: c.name,
        email: c.email ?? null,
        countryCode: c.countryCode ?? "NG",
        isBusiness: c.isBusiness ?? false,
        vatId: c.vatId ?? null,
      });
      customerId = customer.$id;
    }
    if (!customerId) throw new Error("customerId or customer is required");

    const subTotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const vat = await resolveVatRateStrict(this.repo, userId, data.taxReason ?? "domestic");
    const { vatRateApplied, vatAmount, total } = computeVAT(subTotal, vat);

    const number = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const invoice = await this.repo.create(COL_INVOICES, userId, {
      userId,
      customerId,
      number,
      subTotal,
      vatRateApplied,
      vatAmount,
      total,
      currency: data.currency,
      taxReason: data.taxReason ?? "domestic",
      status: "UNPAID",
      notes: data.notes ?? "",
      dueDate: data.dueDate ?? null,
      paymentMethod: data.paymentMethod ?? "OTHER",
      paidAt: null,
    });

    for (const item of data.items) {
      await this.repo.create(COL_ITEMS, userId, {
        userId,
        invoiceId: invoice.$id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      });
    }

    return invoice;
  }

  async list(userId: string, query: ListInvoicesDto) {
    const { status, page, limit } = query;
    const { offset } = paginate(page, limit);
    const queries = [
      Query.equal("userId", userId),
      ...(status ? [Query.equal("status", status)] : []),
      Query.orderDesc("createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ];
    return this.repo.list<any>(COL_INVOICES, queries);
  }


  async markPaid(userId: string, invoiceId: string, body: MarkPaidDto) {
    const invoice = await this.repo.getById<any>(COL_INVOICES, invoiceId, userId);

    const vat = await resolveVatRateStrict(this.repo, userId, invoice.taxReason as any);
    const { vatRateApplied, vatAmount, total } = computeVAT(invoice.subTotal, vat);

    const paidAt = body.paidAt ?? new Date().toISOString();

    const updated = await this.repo.update(COL_INVOICES, invoiceId, userId, {
      status: "PAID",
      paidAt,
      vatRateApplied,
      vatAmount,
      total,
    });

    try {
      const customer = await this.repo.getById<any>(COL_CUSTOMERS, invoice.customerId, userId).catch(() => null);
      const recipient = customer?.email ? [customer.email] : [];
      await messaging.createEmail({
        subject: `Invoice ${invoice.number} marked as PAID`,
        content: `Invoice ${invoice.number} has been paid. Total: ${updated.total} ${updated.currency}.`,
        to: recipient,
        from: env.FROM_EMAIL,
      });
    } catch {}

    return updated;
  }

  async getById(userId: string, invoiceId: string) {
    return this.repo.getById<any>("invoices", invoiceId, userId);
  }
}
