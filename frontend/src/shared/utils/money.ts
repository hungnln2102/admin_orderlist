const toFiniteNumber = (value: number | string): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const roundGiaBanValue = (value: number | string): number => {
  const numeric = toFiniteNumber(value);
  const divisor = 1000;
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric / divisor) * divisor;
};

export const formatCurrency = (value: number | string): string => {
  const rounded = roundGiaBanValue(value);
  return `${rounded.toLocaleString("vi-VN")} ₫`;
};

export const formatCurrencyPlain = (value: number): string => {
  const numeric = toFiniteNumber(value);
  return numeric > 0 ? numeric.toLocaleString("vi-VN") : "";
};

export const formatNumberOnTyping = (value: string): string => {
  const raw = value.replace(/[^\d]/g, "");
  if (!raw) return "";
  const num = parseInt(raw, 10);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("vi-VN").replace(/,/g, ".");
};

export const formatDecimalOnTyping = (value: string): string => {
  let raw = value.replace(/,/g, ".");
  raw = raw.replace(/[^\d.]/g, "");

  const parts = raw.split(".");
  if (parts.length > 2) {
    raw = parts[0] + "." + parts.slice(1).join("");
  }

  return raw;
};

export const formatCurrencyShort = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "₫0";
  if (value >= 1_000_000_000) {
    return `₫${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `₫${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `₫${(value / 1_000).toFixed(1)}K`;
  }
  return `₫${Math.round(value).toLocaleString("vi-VN")}`;
};
