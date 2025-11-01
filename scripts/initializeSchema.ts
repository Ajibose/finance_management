import { Client, Databases } from "node-appwrite";
import { env } from "../src/config/env.js";

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
} = env

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const db = new Databases(client);

// collection Ids
const COL_PROFILES = "profiles";
const COL_CUSTOMERS = "customers";
const COL_VAT_SETTINGS = "vat_settings";
const COL_INVOICES = "invoices";
const COL_INVOICE_ITEMS = "invoice_items";

async function main() {
  /* Profile Collection */
  await createCollection(COL_PROFILES, "Profiles");
  await stringAttr(COL_PROFILES, "userId", 64, true);
  await stringAttr(COL_PROFILES, "businessName", 120, true);
  await stringAttr(COL_PROFILES, "countryCode", 2, true);
  await stringAttr(COL_PROFILES, "currency", 3, true);
  await stringAttr(COL_PROFILES, "emailFrom", 255, false);
  await datetimeAttr(COL_PROFILES, "createdAt", true);
  await datetimeAttr(COL_PROFILES, "updatedAt", true);
  await index(COL_PROFILES, "uniq_profiles_user", "unique", ["userId"]);

  /* Customers Collection */
  await createCollection(COL_CUSTOMERS, "Customers");
  await stringAttr(COL_CUSTOMERS, "userId", 64, true);
  await stringAttr(COL_CUSTOMERS, "name", 100, true);
  await stringAttr(COL_CUSTOMERS, "email", 255, false);
  await stringAttr(COL_CUSTOMERS, "countryCode", 2, true);
  await booleanAttr(COL_CUSTOMERS, "isBusiness", true);
  await stringAttr(COL_CUSTOMERS, "vatId", 64, false);
  await datetimeAttr(COL_CUSTOMERS, "createdAt", true);
  await datetimeAttr(COL_CUSTOMERS, "updatedAt", true);
  await index(COL_CUSTOMERS, "idx_customers_owner", "key", ["userId","createdAt"]);
  await index(COL_CUSTOMERS, "idx_customers_country", "key", ["userId","countryCode"]);

  /* VAT Settings Collection */
  await createCollection(COL_VAT_SETTINGS, "VAT Settings");
  await stringAttr(COL_VAT_SETTINGS, "userId", 64, true);
  await stringAttr(COL_VAT_SETTINGS, "countryCode", 2, true);
  await booleanAttr(COL_VAT_SETTINGS, "isVatRegistered", true);
  await floatAttr(COL_VAT_SETTINGS, "vatRate", true);
  await datetimeAttr(COL_VAT_SETTINGS, "createdAt", true);
  await datetimeAttr(COL_VAT_SETTINGS, "updatedAt", true);
  await index(COL_VAT_SETTINGS, "uniq_vat_settings_user", "unique", ["userId"]);

  /* Invoices Collection */
  await createCollection(COL_INVOICES, "Invoices");
  await stringAttr(COL_INVOICES, "userId", 64, true);
  await stringAttr(COL_INVOICES, "customerId", 64, true);
  await stringAttr(COL_INVOICES, "number", 32, true);
  await floatAttr(COL_INVOICES, "subTotal", true);
  await floatAttr(COL_INVOICES, "vatRateApplied", true);
  await floatAttr(COL_INVOICES, "vatAmount", true);
  await floatAttr(COL_INVOICES, "total", true);
  await stringAttr(COL_INVOICES, "currency", 3, true);
  await enumAttr(COL_INVOICES, "taxReason", ["domestic","export_zero","reverse_charge"], true);
  await enumAttr(COL_INVOICES, "status", ["UNPAID","PAID"], true);
  await datetimeAttr(COL_INVOICES, "paidAt", false);
  await stringAttr(COL_INVOICES, "pdfFileId", 255, false);
  await stringAttr(COL_INVOICES, "notes", 255, false);
  await datetimeAttr(COL_INVOICES, "dueDate", true);
  await datetimeAttr(COL_INVOICES, "createdAt", true);
  await datetimeAttr(COL_INVOICES, "updatedAt", true);
  await enumAttr(COL_INVOICES, "paymentMethod", ["BANK_TRANSFER","CASH","CARD","OTHER"], false);
  await index(COL_INVOICES, "idx_invoices_owner_status", "key", ["userId","status","createdAt"]);
  await index(COL_INVOICES, "uniq_invoices_owner_number", "unique", ["userId","number"]);
  await index(COL_INVOICES, "idx_invoices_owner_customer", "key", ["userId","customerId"]);

  /* Invoice Items Collection */
  await createCollection(COL_INVOICE_ITEMS, "Invoice Items");
  await stringAttr(COL_INVOICE_ITEMS, "invoiceId", 64, true);
  await stringAttr(COL_INVOICE_ITEMS, "userId", 64, true);
  await stringAttr(COL_INVOICE_ITEMS, "name", 255, true);
  await floatAttr(COL_INVOICE_ITEMS, "quantity", true);
  await floatAttr(COL_INVOICE_ITEMS, "unitPrice", true);
  await floatAttr(COL_INVOICE_ITEMS, "total", true);
  await datetimeAttr(COL_INVOICE_ITEMS, "createdAt", true);
  await datetimeAttr(COL_INVOICE_ITEMS, "updatedAt", true);
  await index(COL_INVOICE_ITEMS, "idx_items_invoice", "key", ["invoiceId"]);

  console.log("Appwrite schema bootstrapped");
}


async function createCollection(id: string, name: string) {
  try { await db.createCollection(APPWRITE_DATABASE_ID, id, name); }
  catch (e:any) { if (!/already/i.test(String(e.message))) throw e; }
}

async function stringAttr(col:string,key:string,size:number,req:boolean){
  try { await db.createStringAttribute(APPWRITE_DATABASE_ID, col, key, size, req); }
  catch (e:any){ if (!/already/i.test(String(e.message))) throw e; }
}
async function floatAttr(col:string,key:string,req:boolean){
  try { await db.createFloatAttribute(APPWRITE_DATABASE_ID, col, key, req); }
  catch (e:any){ if (!/already/i.test(String(e.message))) throw e; }
}

async function booleanAttr(col:string,key:string,req:boolean){
  try { await db.createBooleanAttribute(APPWRITE_DATABASE_ID, col, key, req); }
  catch (e:any){ if (!/already/i.test(String(e.message))) throw e; }
}
async function datetimeAttr(col:string,key:boolean,req:boolean){
  try { await db.createDatetimeAttribute(APPWRITE_DATABASE_ID, col, key, req); }
  catch (e:any){ if (!/already/i.test(String(e.message))) throw e; }
}
async function enumAttr(col:string,key:string,values:string[],req:boolean){
  try { await db.createEnumAttribute(APPWRITE_DATABASE_ID, col, key, values, req); }
  catch (e:any){ if (!/already/i.test(String(e.message))) throw e; }
}
async function index(col:string,name:string,type:"key"|"unique"|"fulltext",attrs:string[]){
  try { await db.createIndex(APPWRITE_DATABASE_ID, col, name, type, attrs); }
  catch (e:any){ if (!/already|exists/i.test(String(e.message))) throw e; }
}

main().catch(e => { console.error(e); process.exit(1); });
