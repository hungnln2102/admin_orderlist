export const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const normalizeKey = (value?: string | null) =>
  (value || "").trim().toLowerCase();

export const stripDurationSuffix = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  return raw.replace(/--\s*\d+\s*[md]\s*$/i, "").trim();
};

export const normalizeProductKey = (value?: string | null) =>
  (value || "").trim().toLowerCase();

export const safeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
