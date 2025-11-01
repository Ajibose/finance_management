import { z } from "zod";

/** Profile data (user-facing) */
export const ProfileDto = z.object({
  businessName: z.string().min(1),
  countryCode: z.string().length(2),
  currency: z.string().length(3),
  emailFrom: z.string().email().optional(),
});
export type ProfileDto = z.infer<typeof ProfileDto>;

/** VAT settings (user sets this separately) */
export const VatSettingsDto = z.object({
  isVatRegistered: z.boolean(),
  vatRate: z.number().nonnegative(),
});
export type VatSettingsDto = z.infer<typeof VatSettingsDto>;
