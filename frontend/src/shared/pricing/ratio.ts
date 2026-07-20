import { toFiniteNumberOrNull } from "@/shared/number";

export const resolveDirectNumberOrFallback = (
  fallbackValue?: number | null,
  directValue?: number | null
): number | null => {
  const direct = toFiniteNumberOrNull(directValue);
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  return toFiniteNumberOrNull(fallbackValue);
};

export const multiplyValue = resolveDirectNumberOrFallback;
