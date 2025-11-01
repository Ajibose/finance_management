import { AppwriteRepo } from "../../adapters/appwriteAdapter";
import type { ProfileDto, VatSettingsDto } from "./profile.schema";
import { Query } from "node-appwrite";

const COL_PROFILES = "profiles";
const COL_VAT_SETTINGS = "vat_settings";

export class ProfileService {
  constructor(private readonly repo: AppwriteRepo) {}

  async upsertProfile(userId: string, data: ProfileDto) {
    const existing = await this.repo.findOne<any>(COL_PROFILES, [Query.equal("userId", userId)]);
    if (existing) {
      return this.repo.update(COL_PROFILES, existing.$id, userId, data);
    }
    return this.repo.create(COL_PROFILES, userId, data);
  }

  async getProfile(userId: string) {
    return this.repo.findOne<any>(COL_PROFILES, [Query.equal("userId", userId)]);
  }

  async upsertVatSettings(userId: string, data: VatSettingsDto) {
    // Get user profile
    const profile = await this.repo.findOne<any>(COL_PROFILES, [Query.equal("userId", userId)]);
    if (!profile) throw new Error("Profile not found. Please create profile first.");

    // Merge countryCode from profile into VAT payload
    const payload = {
        ...data,
        countryCode: profile.countryCode
    };

    // Upsert VAT settings
    const existing = await this.repo.findOne<any>(COL_VAT_SETTINGS, [Query.equal("userId", userId)]);
    if (existing) {
        return this.repo.update(COL_VAT_SETTINGS, existing.$id, userId, payload);
    }
    return this.repo.create(COL_VAT_SETTINGS, userId, payload);
    }


  async getVatSettings(userId: string) {
    const vat = await this.repo.findOne<any>(COL_VAT_SETTINGS, [Query.equal("userId", userId)]);
    if (!vat) throw new Error("VAT settings not found. Please set them in profile.");
    return vat;
  }
}
