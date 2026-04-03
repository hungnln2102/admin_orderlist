/**
 * Mẫu ảnh VietQR thống nhất: compact (540×540) — QR + logo VietQR + Napas + ngân hàng.
 * @see https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/api-tao-ma-qr/
 */
export const VIETQR_IMAGE_TEMPLATE = "compact" as const;

export interface SepayQrOptions {
  accountNumber: string;
  bankCode: string;
  amount?: number | null;
  description?: string;
  accountName?: string;
  /** Chỉ dùng khi cần lệch khỏi chuẩn dự án; mặc định = VIETQR_IMAGE_TEMPLATE */
  template?: string;
}

export const buildSepayQrUrl = ({
  accountNumber,
  bankCode,
  amount,
  description,
  accountName,
  template = VIETQR_IMAGE_TEMPLATE,
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
  const tpl = (template || VIETQR_IMAGE_TEMPLATE).trim() || VIETQR_IMAGE_TEMPLATE;
  return `https://img.vietqr.io/image/${bank}-${account}-${tpl}.png${
    queryString ? `?${queryString}` : ""
  }`;
};

/** Alias — cùng buildSepayQrUrl, tên rõ ràng cho ảnh VietQR chuẩn quốc gia */
export const buildVietQrImageUrl = buildSepayQrUrl;
