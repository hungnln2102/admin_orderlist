import {
  formatDecimalMoney,
  formatDecimalMoneyDraft,
  formatDecimalMoneyInput,
  parseDecimalMoneyInput,
} from "@/shared/money";

export const formatUsdtMoney = formatDecimalMoney;
export const parseUsdtMoneyInput = parseDecimalMoneyInput;
export const formatUsdtMoneyInput = formatDecimalMoneyInput;
export const formatUsdtMoneyDraft = formatDecimalMoneyDraft;

export function convertVndToUsd(vndAmount: number, vndPerUsdt: number): number {
  const vnd = Number(vndAmount);
  const rate = Number(vndPerUsdt);
  if (!Number.isFinite(vnd) || vnd <= 0 || !Number.isFinite(rate) || rate <= 0) return 0;
  return Math.round((vnd / rate) * 10000) / 10000;
}
