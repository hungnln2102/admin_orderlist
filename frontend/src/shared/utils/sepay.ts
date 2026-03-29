export interface SepayQrOptions {
  accountNumber: string;
  bankCode: string;
  amount?: number | null;
  description?: string;
  accountName?: string;
}

export const buildSepayQrUrl = ({
  accountNumber,
  bankCode,
  amount,
  description,
  accountName,
}: SepayQrOptions): string => {
  const account = (accountNumber || "").trim();
  const bank = (bankCode || "").trim();
  if (!account || !bank) return "";

  const params = new URLSearchParams();

  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    params.set("amount", Math.round(numericAmount).toString());
  }

  const desc = (description || "").trim();
  if (desc) {
    params.set("addInfo", desc);
  }

  const name = (accountName || "").trim();
  if (name) {
    params.set("accountName", name);
  }

  const queryString = params.toString();
  return `https://img.vietqr.io/image/${bank}-${account}-compact.png${
    queryString ? `?${queryString}` : ""
  }`;
};
