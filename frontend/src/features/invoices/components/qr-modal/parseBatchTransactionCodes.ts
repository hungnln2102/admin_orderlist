const MAV_ORDER_PREFIX_RE = /^MAV[A-Z0-9]{2,}/i;
const BATCH_CODE_RE = /^MAVG[A-Z0-9]{4,20}$/i;

export const normalizeBatchTransactionToken = (value: string): string => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(normalized)) return "";
  if (BATCH_CODE_RE.test(normalized)) return "";
  if (MAV_ORDER_PREFIX_RE.test(normalized)) return "";
  return normalized;
};

/** Trích mã transaction 8 ký tự từ textarea (phẩy / xuống dòng). */
export const parseBatchTransactionCodes = (raw: string): string[] => {
  const unique = new Set<string>();
  const chunks = String(raw || "")
    .split(/[\s,;|\n\r\t]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const direct = normalizeBatchTransactionToken(chunk);
    if (direct) {
      unique.add(direct);
      continue;
    }
    const matches = chunk.toUpperCase().match(/\b[A-Z0-9]{8}\b/g) || [];
    for (const match of matches) {
      const normalized = normalizeBatchTransactionToken(match);
      if (normalized) unique.add(normalized);
    }
  }

  return [...unique];
};
