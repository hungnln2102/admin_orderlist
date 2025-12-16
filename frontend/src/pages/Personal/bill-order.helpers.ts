export type InvoiceForm = {
  invoiceCode: string;
  invoiceDate: string;
  customerName: string;
  address: string;
  phone: string;
  fax: string;
  taxCode: string;
};

export type InvoiceEntry = {
  id: string;
  code: string;
};

export type OrderRow = Record<string, any>;
export type ProductPriceRow = Record<string, any>;

export type InvoiceLine = {
  id: string;
  code: string;
  description: string;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  total: number;
};

let invoiceEntrySeq = 0;
export const buildInvoiceEntry = (code: string): InvoiceEntry => {
  invoiceEntrySeq += 1;
  const uniqueId = `inv-${Date.now().toString(36)}-${invoiceEntrySeq.toString(
    36
  )}`;
  return { id: uniqueId, code };
};

export const normalizeKey = (value?: string | null) =>
  (value || "").trim().toLowerCase();

export const extractMonths = (value?: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/--\s*(\d+)\s*m/i);
  if (match && match[1]) {
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const resolveOrderType = (
  orderCode?: string | null
): "MAVC" | "MAVL" | "MAVK" | "MAVT" | null => {
  const upper = (orderCode || "").trim().toUpperCase();
  if (upper.startsWith("MAVC")) return "MAVC";
  if (upper.startsWith("MAVL")) return "MAVL";
  if (upper.startsWith("MAVK")) return "MAVK";
  if (upper.startsWith("MAVT")) return "MAVT";
  return null;
};

export const toPositiveNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

export const normalizeDiscountRatio = (value: unknown): number => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  // Accept both ratio (0-1) and percent (e.g., 20 => 20%)
  const ratio = num > 1 ? num / 100 : num;
  return Math.min(Math.max(ratio, 0), 1);
};

export const COMPANY_INFO = {
  name: "MAVRYK PREMIUM",
  address: "Phan Văn Trị, Phường 11, Quận Bình Thạnh",
  phone: "(0378.304.963)",
  bank: "VP Bank",
  accountNumber: "9183400998",
  receiver: "Ngô Lê Ngọc Hương",
};

export const DEFAULT_FORM: InvoiceForm = {
  invoiceCode: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  customerName: "",
  address: "",
  phone: "",
  fax: "",
  taxCode: "",
};

export const INVOICE_FONT_STACK =
  "'Myriad Pro','Myriad','Segoe UI','Helvetica Neue',Arial,sans-serif";

export const formatCurrency = (value: number): string =>
  `${value.toLocaleString("vi-VN")} đ`;
