import { formatDateToDMY } from "@/shared/date";
import {
  type WalletColumn,
  type WalletRow,
} from "../../hooks/useWalletBalances";
import { type DisplayColumn } from "./types";

export const formatDate = (value: string) => {
  const parsed = formatDateToDMY(new Date(value));
  return parsed || value;
};

export const buildDisplayColumns = (columns: WalletColumn[]): DisplayColumn[] =>
  columns.map((c) => ({ ...c }));

export const buildAssetCodeByField = (columns: WalletColumn[]) => {
  const map: Record<string, string | undefined> = {};
  columns.forEach((col) => {
    map[col.field] = col.assetCode;
  });
  return map;
};

export const formatNonVnd = (val: number) => {
  const [intPart, decPart] = String(val).split(".");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart ? `${intFormatted}.${decPart}` : intFormatted;
};

export const formatValue = (
  val: number,
  assetCode: string | undefined,
  currencyFormatter: Intl.NumberFormat
) => {
  const amount = Number(val);
  if (!Number.isFinite(amount)) return "-";
  const code = (assetCode || "").toUpperCase();
  if (code === "VND") return currencyFormatter.format(amount);
  if (amount === 0) return "0";
  return formatNonVnd(amount);
};

export const resolveValue = (
  row: WalletRow,
  col: DisplayColumn,
  _assetCodeByField: Record<string, string | undefined>
): number => Number(row.values[col.field] || 0) || 0;
