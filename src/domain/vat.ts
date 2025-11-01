import { Query } from "node-appwrite";
import { repo } from "../adapters/appwriteAdapter";

// ─── Computation ────────────────────────────────
export function computeVAT(subTotal: number, vatRate: number) {
  const vatAmount = +(subTotal * (vatRate / 100)).toFixed(2);
  const total = +(subTotal + vatAmount).toFixed(2);
  return { vatRateApplied: vatRate, vatAmount, total };
}

// ─── Strict Policy ───────────────────────────────
const COL_VAT_SETTINGS = "vat_settings";

export class MissingVatSettingsError extends Error {
  statusCode = 400;
  constructor() {
    super("VAT settings not found. Please configure your VAT in vat_settings first.");
  }
}

/** Strict resolver: user must have a VAT setting saved in Appwrite */
export async function resolveVatRateStrict(
  repo: AppwriteRepo,
  userId: string,
  taxReason?: "domestic" | "export_zero" | "reverse_charge"
): Promise<number> {
  const setting = await repo.findOne<any>("vat_settings", [Query.equal("userId", userId)]);
  if (!setting || !setting.isVatRegistered || typeof setting.vatRate !== "number") {
    throw new MissingVatSettingsError();
  }

  // export or reverse charge => 0%
  if (taxReason === "export_zero" || taxReason === "reverse_charge") {
    return 0;
  }

  return setting.vatRate;
}

