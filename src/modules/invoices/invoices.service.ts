import { Query } from "node-appwrite";
import { computeVAT, resolveVatRateStrict } from "../../domain/vat";
import type { CreateInvoiceDto, MarkPaidDto, ListInvoicesDto } from "./invoices.schema";
import { AppwriteRepo } from "../../adapters/appwriteAdapter";
import { messaging, users } from "../../plugins/appwrite";
import { ID, Users, Query } from "node-appwrite";
import { env } from "../../config/env";
import { paginate } from "../../utils/pagination";
import { emailTemplate } from "../../utils/emailTemplate.js";

const COL_CUSTOMERS = "customers";
const COL_INVOICES = "invoices";
const COL_PROFILES = "profiles";
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

    // Idempotency guard
    if (invoice.status === "PAID") {
      return invoice;
    }
    
    // Recompute VAT in case taxReason or amounts was modified since creation
    const vat = await resolveVatRateStrict(this.repo, userId, invoice.taxReason as any);
    const { vatRateApplied, vatAmount, total } = computeVAT(invoice.subTotal, vat);

    const paidAt = body.paidAt ?? new Date().toISOString();

    // Update invoice status to PAID
    const updated = await this.repo.update(COL_INVOICES, invoiceId, userId, {
      status: "PAID",
      paidAt,
      vatRateApplied,
      vatAmount,
      total,
    });

    // Send email notification to customer
    try {
      const customer = await this.repo.getById<any>(COL_CUSTOMERS, invoice.customerId, userId).catch(() => null);
      if (!customer?.email) {
        console.warn("No customer email on record; skipping messaging.");
        return updated;
      }
      
      const customerEmail: string = customer.email.trim().toLowerCase();

      let contactUserId: string | null = null;

      try {
        const found = await users.list([Query.equal("email", customerEmail)]);
        if (found.total > 0) contactUserId = found.users[0].$id;
      } catch (e) {
        console.warn("users.list failed:", e);
      }

      if (!contactUserId) {
        const created = await users.create(ID.unique(), customerEmail);
        contactUserId = created.$id;
      }

      // ensure an email target exists and capture its id
      let targetId: string | null = null;
    
      try {
        const t = await users.createTarget({
          userId: contactUserId!,
          targetId: ID.unique(),
          providerType: "email",
          identifier: customerEmail,
          name: customer.name ?? customerEmail,
        });
        targetId = t.$id;
        console.log("Created email target:", targetId);
      } catch (e) {
        try {
          const { targets } = await users.listTargets(contactUserId!);
          const match = targets.find(
            (x: any) =>
              x.providerType === "email" &&
              String(x.identifier || "").toLowerCase() === customerEmail
          );

          if (match) {
            targetId = match.$id;
          }
        } catch (e2) {
          console.warn("listTargets failed:", e2);
        }
      }

      if (!targetId) {
        console.warn("No email target available; skipping email send");
        return updated;
      }

      const message = await messaging.createEmail({
        messageId: ID.unique(),
        subject: `Payment Received – Invoice ${invoice.number}`,
        content: emailTemplate(invoice, customer),
        users: [contactUserId],
        targets: [targetId],
        html: true,
        draft: false,
      });
    } catch (err) {
      console.error("Failed to send invoice paid email:", err);
    }

    return updated;
  }

  async getById(userId: string, invoiceId: string) {
    return this.repo.getById<any>("invoices", invoiceId, userId);
  }
}
