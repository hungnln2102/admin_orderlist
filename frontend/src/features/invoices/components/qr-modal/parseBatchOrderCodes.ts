const MAV_ORDER_CODE_RE = /^MAV[A-Z0-9]{3,20}$/i;
const LEGACY_BATCH_CODE_RE = /^MAVG[A-Z0-9]{4,20}$/i;

export const normalizeBatchOrderToken = (value: string): string => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!MAV_ORDER_CODE_RE.test(normalized)) return "";
  if (LEGACY_BATCH_CODE_RE.test(normalized)) return "";
  return normalized;
};

/** Trích mã đơn MAV… từ textarea (phẩy / xuống dòng). */
export const parseBatchOrderCodes = (raw: string): string[] => {
  const unique = new Set<string>();
  const chunks = String(raw || "")
    .split(/[\s,;|\n\r\t]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const direct = normalizeBatchOrderToken(chunk);
    if (direct) {
      unique.add(direct);
      continue;
    }
    const matches = chunk.toUpperCase().match(/\bMAV[A-Z0-9]{3,20}\b/g) || [];
    for (const match of matches) {
      const normalized = normalizeBatchOrderToken(match);
      if (normalized) unique.add(normalized);
    }
  }

  return [...unique];
};
