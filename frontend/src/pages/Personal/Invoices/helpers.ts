import { utils as XLSXUtils } from "xlsx";
import { PAYMENT_RECEIPT_COLS } from "../../../lib/tableSql";
import * as Helpers from "../../../lib/helpers";

export interface PaymentReceipt {
  id: number;
  orderCode: string;
  paidAt: string;
  amount: number;
  sender: string;
  receiver: string;
  note: string;
}

export type ReceiptCategory = "receipt" | "refund";

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

export const determineReceiptCategory = (
  orderCode: string | null | undefined
): ReceiptCategory => {
  const normalized = (orderCode || "").toUpperCase().trim();
  if (!normalized) return "refund";
  return normalized.startsWith("MAV") ? "receipt" : "refund";
};

export const CATEGORY_OPTIONS: {
  value: ReceiptCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "receipt",
    label: "Biên Nhận",
    description: "Mã đơn bắt đầu bằng MAV",
  },
  {
    value: "refund",
    label: "Hoàn tiền",
    description: "Các biên nhận khác",
  },
];

export const QR_BANK_INFO = {
  bankName: "VP Bank",
  accountHolder: "NGO LE NGOC HUNG",
  accountNumber: "9183400998",
  bankBin: "970432",
  bankCode: "VPB", // VietQR short code
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
  };
};

export const buildExportWorksheet = (rows: PaymentReceipt[]) => {
  const headerRow = [
    "#",
    "Mã đơn",
    "Người gửi",
    "Người nhận",
    "Số tiền gốc",
    "Số tiền định dạng",
    "Nội dung chuyển khoản",
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
    receipt.paidAt ? Helpers.formatDateToDMY(receipt.paidAt) : "",
    determineReceiptCategory(receipt.orderCode) === "receipt"
      ? "Biên nhận"
      : "Hoàn tiền",
  ]);

  const worksheet = XLSXUtils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 26 },
    { wch: 14 },
    { wch: 20 },
    { wch: 48 },
    { wch: 14 },
    { wch: 12 },
  ];

  return worksheet;
};
