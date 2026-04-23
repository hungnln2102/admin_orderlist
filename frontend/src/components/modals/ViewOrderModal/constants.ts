const ENV = import.meta.env;

const pick = (...values: Array<string | undefined>) =>
  values.map((v) => String(v || "").trim()).find(Boolean) || "";

export const BANK_SHORT_CODE = pick(
  ENV.VITE_ORDER_QR_BANK_CODE,
  ENV.VITE_BANK_ID,
  "VPB"
);
export const ACCOUNT_NO = pick(
  ENV.VITE_ORDER_QR_ACCOUNT_NUMBER,
  ENV.VITE_BANK_ACCOUNT_NO
);
export const ACCOUNT_NAME = pick(
  ENV.VITE_ORDER_QR_ACCOUNT_NAME,
  ENV.VITE_BANK_ACCOUNT_NAME
);
export const BANK_DISPLAY_NAME = (ENV.VITE_ORDER_QR_BANK_NAME || "VP Bank").trim();
export const BANK_BIN = (
  ENV.VITE_ORDER_QR_BANK_BIN ||
  (BANK_SHORT_CODE.toUpperCase() === "VPB" ? "970432" : "")
).trim();
export const ORDER_QR_NOTE_PREFIX = (ENV.VITE_ORDER_QR_NOTE_PREFIX || "Thanh toan").trim();
