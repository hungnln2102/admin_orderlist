export function formatShopBankMoney(value: number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return Math.round(amount).toLocaleString("vi-VN");
}

export function parseShopBankMoneyInput(value: string): number {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return 0;
  const amount = Number(digits);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

export function formatShopBankMoneyInput(value: number): string {
  if (!value) return "";
  return formatShopBankMoney(value);
}

/** Định dạng chuỗi đang gõ (chỉ giữ chữ số → 500.000). */
export function formatShopBankMoneyDraft(value: string): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const amount = Number(digits);
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString("vi-VN");
}
