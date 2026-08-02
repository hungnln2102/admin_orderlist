const QUOTE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Mã báo giá ngẫu nhiên dạng BG-XXXXXXXX (mỗi phiên trang). */
export function generateQuoteCode(): string {
  const len = 8;
  const chars: string[] = [];
  const buf = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < len; i++) {
    chars.push(QUOTE_CODE_ALPHABET[buf[i] % QUOTE_CODE_ALPHABET.length]!);
  }
  return `BG-${chars.join("")}`;
}
