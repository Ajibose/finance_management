import { Query } from "node-appwrite";
import { AppwriteRepo } from "../../adapters/appwriteAdapter";
import type { SummaryQueryDto } from "./summary.schema";

const COL_INVOICES = "invoices";

type InvoiceDoc = {
  userId: string;
  customerId: string;
  number: string;
  subTotal: number;
  vatRateApplied: number;
  vatAmount: number;
  total: number;
  currency: string;
  taxReason: "domestic" | "export_zero" | "reverse_charge";
  status: "PAID" | "UNPAID";
  notes?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  $id: string;
};

export class SummaryService {
  constructor(private readonly repo: AppwriteRepo) {}

  private async fetchAllInvoices(userId: string, q?: SummaryQueryDto, chunk = 100): Promise<InvoiceDoc[]> {
    const docs: InvoiceDoc[] = [];
    let offset = 0;

    while (true) {
      const queries = [
        Query.equal("userId", userId),
        ...(q?.from ? [Query.greaterThanEqual("createdAt", q.from)] : []),
        ...(q?.to ? [Query.lessThanEqual("createdAt", q.to)] : []),
        ...(q?.currency ? [Query.equal("currency", q.currency)] : []),
        Query.orderDesc("createdAt"),
        Query.limit(chunk),
        Query.offset(offset),
      ];

      const page = await this.repo.list<InvoiceDoc>(COL_INVOICES, queries);
      docs.push(...page);
      if (page.length < chunk) break;
      offset += chunk;
    }

    return docs;
  }

  /** Build YYYY, YYYY-MM, or YYYY-MM-DD from an ISO date depending on groupBy */
  private dateKey(iso: string | null | undefined, groupBy: "day" | "month" | "year"): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const dd = d.getUTCDate().toString().padStart(2, "0");
    if (groupBy === "year") return `${y}`;
    if (groupBy === "day") return `${y}-${m}-${dd}`;
    return `${y}-${m}`; // month (default)
  }

  async getSummary(userId: string, q?: SummaryQueryDto) {
    const groupBy = q?.groupBy ?? "month";
    const invoices = await this.fetchAllInvoices(userId, q);

    let totalRevenue = 0;          // sum of total for PAID
    let totalVAT = 0;              // sum of vatAmount for PAID
    let unpaidAmount = 0;          // sum of total for all UNPAID (info only)
    let overdueAmount = 0;         // sum of total for UNPAID & past due
    let paidCount = 0;
    let unpaidCount = 0;
    let lastPaidAt: string | null = null;

    const buckets: Record<string, { revenue: number; vat: number; count: number }> = {};
    const byCustomer: Record<string, { total: number; count: number }> = {};
    const currencies = new Set<string>();

    const todayIso = new Date().toISOString();

    for (const inv of invoices) {
      currencies.add(inv.currency);
      const isPaid = inv.status === "PAID";

      if (isPaid) {
        paidCount += 1;
        totalRevenue += inv.total || 0;
        totalVAT += inv.vatAmount || 0;

        if (inv.paidAt && (!lastPaidAt || inv.paidAt > lastPaidAt)) {
          lastPaidAt = inv.paidAt;
        }

        const key = this.dateKey(inv.paidAt ?? inv.createdAt, groupBy);
        if (key) {
          buckets[key] ??= { revenue: 0, vat: 0, count: 0 };
          buckets[key].revenue += inv.total || 0;
          buckets[key].vat += inv.vatAmount || 0;
          buckets[key].count += 1;
        }
      } else {
        unpaidCount += 1;

        const amt = inv.total || 0;
        unpaidAmount += amt;

        const isOverdue = !!(inv.dueDate && inv.dueDate < todayIso);
        if (isOverdue) overdueAmount += amt;

        const key = this.dateKey(inv.createdAt, groupBy);
        if (key) {
          buckets[key] ??= { revenue: 0, vat: 0, count: 0 };
          buckets[key].count += 1;
        }
      }

      if (inv.customerId) {
        const c = (byCustomer[inv.customerId] ??= { total: 0, count: 0 });
        if (isPaid) c.total += inv.total || 0; // rank by paid revenue
        c.count += 1;
      }
    }

    const outstandingCount = invoices.filter(
      (i) => i.status === "UNPAID" && i.dueDate && i.dueDate < todayIso
    ).length;

    const trend = Object.entries(buckets)
      .map(([bucket, v]) => ({ bucket, revenue: v.revenue, vat: v.vat, count: v.count }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));

    const topCustomers = Object.entries(byCustomer)
      .map(([customerId, v]) => ({ customerId, total: v.total, invoices: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const currencyUsed =
      q?.currency ?? (currencies.size === 1 ? [...currencies][0] : "MIXED");

    return {
      totals: {
        paidCount,
        unpaidCount,
        outstandingCount,               // count of overdue invoices
        totalRevenue,                   // PAID only
        totalVAT,                       // PAID only
        outstandingAmount: overdueAmount, // amount overdue (UNPAID & past due)
        pendingAmount: Math.max(0, unpaidAmount - overdueAmount),
        lastPaidAt,
        period: { from: q?.from ?? null, to: q?.to ?? null },
        currency: currencyUsed,
      },
      groupBy,
      trend,
      topCustomers,
    };
  }
}
