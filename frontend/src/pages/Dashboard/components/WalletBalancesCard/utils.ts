import * as Helpers from "../../../../lib/helpers";
import {
  type WalletColumn,
  type WalletRow,
} from "../../hooks/useWalletBalances";
import { type DisplayColumn, type ResolvedFieldValue } from "./types";

export const formatDate = (value: string) => {
  const parsed = Helpers.formatDateToDMY(new Date(value));
  return parsed || value;
};

export const buildDisplayColumns = (
  columns: WalletColumn[]
): DisplayColumn[] => {
  const normalize = (val: string) =>
    (val || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

  const goldCols = columns.filter((col) => {
    const name = normalize(col.name || col.field || "");
    return (
      name.includes("hana") ||
      name.includes("gold") ||
      name.includes("vang")
    );
  });
  const nonGoldCols = columns.filter((col) => !goldCols.includes(col));

  if (!goldCols.length) return columns;

  const goldAssetCodes = Array.from(
    new Set(
      goldCols
        .map((col) => (col.assetCode || "").toUpperCase())
        .filter(Boolean)
    )
  );

  return [
    ...nonGoldCols,
    {
      id: 0,
      field: "wallet_gold_combined",
      name: "HanaGold / Vang",
      assetCode: goldAssetCodes.length === 1 ? goldAssetCodes[0] : undefined,
      sourceFields: goldCols.map((col) => col.field),
    },
  ];
};

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
  if (!val) return "-";
  const code = (assetCode || "").toUpperCase();
  if (code === "VND") return currencyFormatter.format(val);
  return formatNonVnd(val);
};

export const resolveValue = (
  row: WalletRow,
  col: DisplayColumn,
  assetCodeByField: Record<string, string | undefined>
): number | ResolvedFieldValue[] => {
  if (col.sourceFields && col.sourceFields.length) {
    return col.sourceFields.map((field) => ({
      field,
      value: Number(row.values[field] || 0) || 0,
      assetCode: assetCodeByField[field],
    }));
  }
  return Number(row.values[col.field] || 0);
};
