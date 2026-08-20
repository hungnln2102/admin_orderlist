/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatDateToDMY } from "@/shared/date";

export type { ShopBankDisplay } from "@/features/wallet/shop-bank-accounts/helpers/shopBankQrDefaults";
export { toShopBankDisplay } from "@/features/wallet/shop-bank-accounts/helpers/shopBankQrDefaults";

export interface PaymentReceipt {
  id: number;
  orderCode: string;
  paidAt: string;
  amount: number;
  sender: string;
  receiver: string;
  note: string;
  /** Theo `payment_receipt_financial_state` — API payment-receipts */
  isFinancialPosted?: boolean;
  postedRevenue?: number;
  postedProfit?: number;
  postedOffFlowBankReceipt?: number;
  reconciledAt?: string | null;
  adjustmentApplied?: boolean;
  outboundAmount?: number;
  outboundReason?: string;
  outboundReasonLabel?: string;
  outboundContent?: string;
  flowTypeId?: number | null;
  flowClassifiedAt?: string | null;
  flowNote?: string;
  flowTypeLabel?: string | null;
  flowTypeCode?: string | null;
  originalOrderCode?: string | null;
}

export interface ReceiptFlowType {
  id: number;
  code: string;
  label: string;
  direction: "in" | "out" | "neutral";
  effect: "order_match" | "off_flow_revenue" | "withdrawal" | "import_order" | "ignore";
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface MatchableOrder {
  id: number;
  orderCode: string;
  transaction: string;
  status: string;
  customer: string;
  informationOrder: string;
}

export type ReceiptCategory = "receipt" | "outbound-unallocated" | "out-of-flow";

export const formatCurrencyVnd = (value: number): string => {
  if (!Number.isFinite(value)) return "VND 0";
  return `VND ${Math.round(value).toLocaleString("vi-VN")}`;
};

export const formatCurrencyVndFull = (value: number): string => {
  if (!Number.isFinite(value)) return "0 VND";
  return `${Math.round(value).toLocaleString("vi-VN")} VND`;
};

const extractSenderFromNote = (note?: string | null): string | null => {
  if (!note) return null;
  const match = note.match(/nhan tu\s+(.+?)\s+trace/i);
  if (!match) return null;
  const sender = match[1].trim();
  return sender || null;
};

export const resolveSender = (receipt: PaymentReceipt): string =>
  extractSenderFromNote(receipt.note) || receipt.sender || "";

export const extractTransactionCodeFromNote = (
  note: string | null | undefined
): string => {
  if (!note) return "";
  const match = String(note).match(/trace\D*([0-9]{3,})/i);
  return match?.[1] || "";
};

export type ReceiptCategoryInput = Pick<
  PaymentReceipt,
  | "orderCode"
  | "postedRevenue"
  | "postedProfit"
  | "postedOffFlowBankReceipt"
  | "amount"
  | "outboundAmount"
  | "outboundReasonLabel"
  | "isFinancialPosted"
  | "reconciledAt"
>;

/**
 * Phân tab Biên nhận vs Chi phí chưa liệt kê vs Chi phí & Ngoài luồng:
 */
export const determineReceiptCategory = (
  receiptOrCode:
    | string
    | null
    | undefined
    | ReceiptCategoryInput
): ReceiptCategory => {
  const receipt: ReceiptCategoryInput =
    typeof receiptOrCode === "string" || receiptOrCode == null
      ? {
        orderCode: receiptOrCode ?? "",
        postedRevenue: 0,
        postedProfit: 0,
        postedOffFlowBankReceipt: 0,
        amount: 0,
        outboundAmount: 0,
        isFinancialPosted: false,
      }
      : receiptOrCode;

  const normalized = (receipt.orderCode || "").toUpperCase().trim();
  const isOrderMatched = normalized.startsWith("MAV");

  if (isOrderMatched) {
    return "receipt";
  }

  // Nếu không khớp mã đơn hàng MAV, giao dịch phải được xác nhận tài chính (isFinancialPosted) mới thuộc "Tiền ngoài luồng / Chi phí"
  if (receipt.isFinancialPosted) {
    return "out-of-flow";
  }

  return "outbound-unallocated";
};


export const CATEGORY_OPTIONS: {
  value: ReceiptCategory;
  label: string;
}[] = [
    {
      value: "receipt",
      label: "Thanh toán đơn hàng",
    },
    {
      value: "out-of-flow",
      label: "Tiền ngoài luồng / Chi phí",
    },
    {
      value: "outbound-unallocated",
      label: "Chưa được liệt kê",
    },
  ];

export const parseDMYDate = (value: string): number | null => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  return new Date(y, m - 1, d).getTime();
};

export const toDisplayDate = (value: string): string => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
};

export const toISODate = (value: string): string => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
};

export { normalizeReceiptRow } from "./utils/receiptMapper";

export const buildExportWorksheet = (
  rows: PaymentReceipt[],
  xlsxUtils: typeof import("xlsx").utils
) => {
  const headerRow = [
    "#",
    "Mã đơn",
    "Người gửi",
    "Người nhận",
    "Số tiền gốc",
    "Số tiền định dạng",
    "Nội dung chuyển khoản",
    "Mã giao dịch",
    "Ngày thanh toán",
    "Nhóm",
  ];

  const dataRows = rows.map((receipt, index) => [
    index + 1,
    receipt.orderCode || "",
    resolveSender(receipt),
    receipt.receiver || "",
    receipt.amount,
    formatCurrencyVnd(receipt.amount),
    receipt.note || "",
    extractTransactionCodeFromNote(receipt.note),
    receipt.paidAt ? formatDateToDMY(receipt.paidAt) : "",
    determineReceiptCategory(receipt) === "receipt"
      ? "Biên nhận"
      : "Ngoài luồng",
  ]);

  const worksheet = xlsxUtils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 26 },
    { wch: 14 },
    { wch: 20 },
    { wch: 48 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
  ];

  return worksheet;
};
