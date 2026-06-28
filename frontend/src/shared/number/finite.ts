export const toFiniteNumberOrNull = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const toFiniteNumber = (value: unknown, fallback = 0): number =>
  toFiniteNumberOrNull(value) ?? fallback;

export const isPositiveFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const parsePositiveIntOrNull = (value: unknown): number | null => {
  const numeric = toFiniteNumberOrNull(value);
  if (numeric === null || numeric <= 0) return null;
  const integer = Math.trunc(numeric);
  return integer > 0 ? integer : null;
};

export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
