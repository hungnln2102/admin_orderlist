import type { ProductEditFormState } from "../../types";

export const parseCurrencyInput = (value: string): number | null => {
  const digits = String(value ?? "").replace(/\D+/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseBasePriceInput = (
  value: string,
  currency: ProductEditFormState["basePriceCurrency"]
): number | null => {
  if (currency === "VND") return parseCurrencyInput(value);

  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
