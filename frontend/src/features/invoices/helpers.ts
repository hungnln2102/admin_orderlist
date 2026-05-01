import { PAYMENT_RECEIPT_COLS } from "@/lib/tableSql";
import * as Helpers from "@/lib/helpers";
import {
  ACCOUNT_NAME,
  ACCOUNT_NO,
  BANK_BIN,
  BANK_DISPLAY_NAME,
  BANK_SHORT_CODE,
} from "@/components/modals/ViewOrderModal/constants";

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
}

export interface MatchableOrder {
  id: number;
  orderCode: string;
  status: string;
  customer: string;
  informationOrder: string;
}

export type ReceiptCategory = "receipt" | "out-of-flow";

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
  "orderCode" | "postedRevenue" | "postedProfit" | "postedOffFlowBankReceipt"
>;

/**
 * Phân tab Biên nhận vs Ngoài luồng:
 * - Webhook «tiền thừa» (Đã TT + chỉ cộng `posted_off_flow_bank_receipt`, không DT/LN): luôn Ngoài luồng.
 * - Chỉ khi ghép mã + reconcile đưa vào đơn khả dụng → financial_state đổi → hiển thị lại tab Biên nhận.
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
        }
      : receiptOrCode;

  const off = Number(receipt.postedOffFlowBankReceipt) || 0;
  const rev = Number(receipt.postedRevenue) || 0;
  const prof = Number(receipt.postedProfit) || 0;

  if (off > 0 && rev === 0 && prof === 0) {
    return "out-of-flow";
  }

  const normalized = (receipt.orderCode || "").toUpperCase().trim();
  if (!normalized) return "out-of-flow";
  return normalized.startsWith("MAV") ? "receipt" : "out-of-flow";
};

export const CATEGORY_OPTIONS: {
  value: ReceiptCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "receipt",
    label: "Biên Nhận",
    description: "MAV đúng luồng thanh toán đơn (không chỉ tiền thừa NH)",
  },
  {
    value: "out-of-flow",
    label: "Ngoài Luồng",
    description: "Tiền thừa sau Đã TT, không mã đơn, hoặc không MAV",
  },
];

export const QR_BANK_INFO = {
  bankName: BANK_DISPLAY_NAME,
  accountHolder: ACCOUNT_NAME,
  accountNumber: ACCOUNT_NO,
  bankBin: BANK_BIN,
  bankCode: BANK_SHORT_CODE, // VietQR short code
};

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

export const normalizeReceiptRow = (
  row: Partial<PaymentReceipt> & Record<string, unknown>
): PaymentReceipt => {
  const toSafeString = (value: unknown) =>
    typeof value === "string" ? value : "";
  return {
    id: Number(row?.id) || 0,
    orderCode: toSafeString(
      row?.orderCode ?? row?.[PAYMENT_RECEIPT_COLS.orderCode]
    ),
    paidAt: toSafeString(row?.paidAt ?? row?.[PAYMENT_RECEIPT_COLS.paidDate]),
    amount: Number(row?.amount ?? row?.[PAYMENT_RECEIPT_COLS.amount]) || 0,
    sender: toSafeString(row?.sender ?? row?.[PAYMENT_RECEIPT_COLS.sender]),
    receiver: toSafeString(row?.receiver ?? row?.[PAYMENT_RECEIPT_COLS.receiver]),
    note: toSafeString(row?.note ?? row?.[PAYMENT_RECEIPT_COLS.note]),
    isFinancialPosted: Boolean(row?.isFinancialPosted),
    postedRevenue: Number(row?.postedRevenue) || 0,
    postedProfit: Number(row?.postedProfit) || 0,
    postedOffFlowBankReceipt: Number(row?.postedOffFlowBankReceipt) || 0,
    reconciledAt:
      row?.reconciledAt != null ? String(row.reconciledAt) : null,
    adjustmentApplied: Boolean(row?.adjustmentApplied),
  };
};

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
    receipt.paidAt ? Helpers.formatDateToDMY(receipt.paidAt) : "",
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
