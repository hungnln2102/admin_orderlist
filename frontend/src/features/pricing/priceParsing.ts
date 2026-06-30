export const toNumberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const parseBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;
  return ["true", "1", "t", "y", "yes"].includes(normalized);
};

export const toFinitePrice = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
};
