import { computeVAT, resolveVatRateStrict } from "../../domain/vat";
import type { CreateInvoiceDto, MarkPaidDto, ListInvoicesDto } from "./invoices.schema";
import { AppwriteRepo } from "../../adapters/appwriteAdapter";
import { messaging, users } from "../../plugins/appwrite";
import { ID, Users, Query, Role, Permission } from "node-appwrite";
import { env } from "../../config/env";
import { paginate } from "../../utils/pagination";
import { emailTemplate } from "../../utils/emailTemplate.js";
import PdfPrinter from "pdfmake";
import fs from "node:fs/promises";
import path from "node:path";
import { storage } from "../../plugins/appwrite";


const COL_CUSTOMERS = "customers";
const COL_INVOICES = "invoices";
const COL_PROFILES = "profiles";
const COL_ITEMS = "invoice_items";

const printer = new PdfPrinter({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
});

const APPWRITE_BUCKET_ID = env.APPWRITE_BUCKET_ID!;


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
    const now = new Date().toISOString();

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
      createdAt: now,
      updatedAt: now,
    });

    // Create invoice items
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
    
    const pdfInfo = await this.generateAndStorePdf(invoice, data.items);
    if (pdfInfo) {
      await this.repo.update(COL_INVOICES, invoice.$id, userId, { ...pdfInfo, updatedAt: new Date().toISOString() });
    }

    return invoice;
  }

  private async generateAndStorePdf(
    invoice: any,
    items: Array<{ name: string; quantity: number; unitPrice: number }>
  ) {
    try {
      const currency = invoice.currency || "NGN";

      const docDefinition = {
        content: [
          { text: `INVOICE ${invoice.number}`, style: "h1" },
          {
            columns: [
              { text: `Issued: ${invoice.createdAt ? new Date(invoice.createdAt).toDateString() : new Date().toDateString()}` },
              { text: `Due: ${invoice.dueDate ? new Date(invoice.dueDate).toDateString() : "N/A"}`, alignment: "right" },
            ],
            margin: [0, 0, 0, 8],
          },
          {
            table: {
              widths: ["*", 40, 70, 80],
              body: [
                [
                  { text: "Description", bold: true },
                  { text: "Qty", bold: true, alignment: "right" },
                  { text: "Unit", bold: true, alignment: "right" },
                  { text: "Line", bold: true, alignment: "right" },
                ],
                ...items.map(i => {
                  const line = i.quantity * i.unitPrice;
                  return [
                    i.name,
                    { text: i.quantity, alignment: "right" },
                    { text: money(i.unitPrice, currency), alignment: "right" },
                    { text: money(line, currency), alignment: "right" },
                  ];
                }),
                [{ text: "Subtotal", colSpan: 3, alignment: "right" }, {}, {}, { text: money(invoice.subTotal, currency), alignment: "right" }],
                [{ text: "VAT", colSpan: 3, alignment: "right" }, {}, {}, { text: money(invoice.vatAmount, currency), alignment: "right" }],
                [{ text: "Total", colSpan: 3, alignment: "right", bold: true }, {}, {}, { text: money(invoice.total, currency), alignment: "right", bold: true }],
              ],
            },
            layout: "lightHorizontalLines",
            margin: [0, 8, 0, 8],
          },
          invoice.notes ? { text: invoice.notes, italics: true, margin: [0, 8, 0, 0] } : {},
        ],
        styles: { h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] } },
        defaultStyle: { font: "Helvetica", fontSize: 10 },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const tmpPath = path.join("/tmp", `${invoice.number}.pdf`);
      const handle = await fs.open(tmpPath, "w");
      const ws = handle.createWriteStream();
      pdfDoc.pipe(ws);
      pdfDoc.end();

      await new Promise<void>((resolve, reject) => {
        ws.on("finish", resolve);
        ws.on("error", reject);
      });

      const buffer = await fs.readFile(tmpPath);

      const file = new File([buffer], `${invoice.number}.pdf`, { type: "application/pdf" });
      const uploaded = await storage.createFile(
        APPWRITE_BUCKET_ID!,
        ID.unique(),
        file,
        [
          Permission.read(Role.any()),
        ]
      );

      await fs.unlink(tmpPath);

      return { pdfFileId: uploaded.$id };
    } catch (e) {
      console.error("PDF generation/upload failed:", e);
      return null;
    }

    function money(n: number, cur: string) {
      return `${cur} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
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
        attachments: [`${APPWRITE_BUCKET_ID}:${invoice.pdfFileId}`],
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
