export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  userId: string;
  customerId: string;
  number: string;
  items: InvoiceItem[];
  subTotal: number;
  vatRateApplied: number;
  vatAmount: number;
  total: number;
  status: "PAID" | "UNPAID";
  currency: string;
  createdAt: string;
}
