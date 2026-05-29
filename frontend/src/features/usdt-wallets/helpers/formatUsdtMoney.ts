export function formatUsdtMoney(value: number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function parseUsdtMoneyInput(value: string): number {
  const normalized = String(value || "").replace(/,/g, "").trim();
  if (!normalized) return 0;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 10000) / 10000;
}

export function formatUsdtMoneyInput(value: number): string {
  if (!value) return "";
  return formatUsdtMoney(value);
}

export function formatUsdtMoneyDraft(value: string): string {
  const cleaned = String(value || "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) return cleaned;
  return formatUsdtMoney(amount);
}

export function convertVndToUsd(vndAmount: number, vndPerUsdt: number): number {
  const vnd = Number(vndAmount);
  const rate = Number(vndPerUsdt);
  if (!Number.isFinite(vnd) || vnd <= 0 || !Number.isFinite(rate) || rate <= 0) return 0;
  return Math.round((vnd / rate) * 10000) / 10000;
}
