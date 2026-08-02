import { formatDateToDMY } from "@/shared/date";

export const normalizeIdentifier = (value: string | null | undefined): string => {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
};

export const buildIdentifierKeys = (value: string | null | undefined) => {
  const normalized = normalizeIdentifier(value);
  return {
    normalized,
    lettersOnly: normalized.replace(/[0-9]/g, ""),
  };
};

export const toCleanString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const asString = typeof value === "string" ? value : String(value);
  return asString.trim();
};

export const formatDisplayDate = (value?: string | null): string => {
  const normalized = formatDateToDMY(value ?? "");
  if (normalized) return normalized;

  const trimmed = (value || "").trim();
  if (!trimmed) return "";

  // Accept flexible D/M/YYYY (with or without leading zero) and normalize.
  const looseMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (looseMatch) {
    const [, d, m, y] = looseMatch;
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }

  return trimmed;
};

export const normalizeSlotKey = (value: unknown): string => {
  const cleaned = toCleanString(value);
  return cleaned ? cleaned.replace(/\s+/g, " ").trim().toLowerCase() : "";
};

export const normalizeMatchKey = (value: string | null | undefined): string => {
  const trimmed = toCleanString(value);
  return trimmed ? trimmed.toLowerCase().replace(/\s+/g, "") : "";
};

export const normalizeProductCodeValue = (value?: string | null): string => {
  return normalizeIdentifier(value);
};

export const parseNumericValue = (input: unknown): number | null => {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === "string") {
    const cleaned = input.replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const toInputString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
};
