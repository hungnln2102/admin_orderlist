import type { RateDescriptionInput } from "./types";

export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export const roundToNearestThousand = (value?: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(Math.abs(value) / 1000) * 1000;
  return value < 0 ? -rounded : rounded;
};

export const formatVndInput = (raw: string): string => {
  const digits = (raw || "").replace(/\D+/g, "");
  if (!digits) return "";
  const num = Number(digits);
  if (!Number.isFinite(num)) return "";
  return num.toLocaleString("vi-VN");
};

export const formatVndDisplay = (value: string | number): string => {
  if (value === null || value === undefined) return "";
  const raw =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : value;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return "";
  const num = Number(digits);
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat("vi-VN").format(num);
};

export const parseRatioInput = (value: string): number | null => {
  if (value === undefined || value === null) return null;
  const digits = String(value).replace(/\D+/g, "");
  if (!digits) return null;
  const numeric = Number(digits);
  return Number.isFinite(numeric) ? numeric : null;
};

export const calculateProfitPercentBySale = (
  sellingPrice?: number | null,
  costPrice?: number | null
): number | null => {
  if (
    typeof sellingPrice !== "number" ||
    !Number.isFinite(sellingPrice) ||
    sellingPrice <= 0
  ) {
    return null;
  }
  if (
    typeof costPrice !== "number" ||
    !Number.isFinite(costPrice) ||
    costPrice < 0
  ) {
    return null;
  }

  return ((sellingPrice - costPrice) / sellingPrice) * 100;
};

export const formatProfitPercentBySale = (
  sellingPrice?: number | null,
  costPrice?: number | null,
  mode: "short" | "full" = "short"
): string | null => {
  const percent = calculateProfitPercentBySale(sellingPrice, costPrice);
  if (percent === null) return null;

  const rounded = Math.round(percent * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const hasDecimal = Math.abs(abs - Math.trunc(abs)) > 0;
  const formatted = abs.toLocaleString("vi-VN", {
    minimumFractionDigits: hasDecimal ? 1 : 0,
    maximumFractionDigits: 1,
  });

  if (mode === "full") {
    return `${sign}${formatted}% lợi nhuận theo giá bán`;
  }

  return `${sign}${formatted}%`;
};

export const formatRateDescription = ({ multiplier, price, basePrice }: RateDescriptionInput): string => {
  void multiplier;
  return formatProfitPercentBySale(price, basePrice, "short") ?? "Chưa có % LN";
};

export const formatCurrencyValue = (value?: number | null): string => {
  const rounded = roundToNearestThousand(value);
  if (rounded === null || rounded <= 0) {
    return "-";
  }
  return currencyFormatter.format(rounded);
};

export const formatPromoPercent = (value?: number | null): string | null => {
  void value;
  return null;
};

export const formatDateLabel = (value?: string | null): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("vi-VN");
  }
  return value;
};

export const formatProfitValue = (value: number | null): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const rounded = roundToNearestThousand(value) ?? 0;
  if (rounded === 0) return currencyFormatter.format(0);
  return currencyFormatter.format(rounded);
};

export const formatProfitRange = (importPrice?: number | null, wholesalePrice?: number | null, retailPrice?: number | null): string => {
  if (typeof importPrice !== "number" || !Number.isFinite(importPrice)) {
    return "-";
  }
  const wholesaleDiff = typeof wholesalePrice === "number" && Number.isFinite(wholesalePrice) ? wholesalePrice - importPrice : null;
  const retailDiff = typeof retailPrice === "number" && Number.isFinite(retailPrice) ? retailPrice - importPrice : null;

  const wholesaleText = formatProfitValue(wholesaleDiff);
  const retailText = formatProfitValue(retailDiff);

  return `${wholesaleText} - ${retailText}`;
};
