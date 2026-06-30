import {
  getDiscountRatioInput,
  getMarginRatioInput,
  multiplyValue,
} from "@/shared/pricing";
import type { ProductPricingRow } from "./types";
import { toNumberOrNull } from "./priceParsing";

export { getMarginRatioInput, getDiscountRatioInput };

export const hasValidPromoRatio = (
  value?: number | null,
  _pctKhach?: number | null,
  _pctCtv?: number | null
): boolean => {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
};

export { multiplyValue };

export const multiplyBasePrice = (ratio?: number | null, basePrice?: number | null): number | null =>
  multiplyValue(basePrice, ratio);

/** Chỉ tính giá sinh viên khi pct_stu > 0; null/0/âm => không hiển thị giá. */
export const effectiveStudentMarginPct = (
  pctStu?: number | null,
  _pctKhach?: number | null
): number | null => {
  if (
    pctStu !== null &&
    pctStu !== undefined &&
    Number.isFinite(pctStu) &&
    pctStu > 0
  ) {
    return pctStu;
  }
  return null;
};

export const computeStudentPrice = (
  _wholesalePrice?: number | null,
  pctStu?: number | null,
  _pctKhach?: number | null
): number | null => {
  const direct = toNumberOrNull(pctStu);
  return typeof direct === "number" && direct > 0 ? direct : null;
};

export const calculatePromoPrice = (
  _pctKhach?: number | null,
  pctPromo?: number | null,
  _pctCtv?: number | null,
  _wholesalePrice?: number | null,
  _fallbackBasePrice?: number | null
): number | null => {
  const direct = toNumberOrNull(pctPromo);
  return typeof direct === "number" && direct > 0 ? direct : null;
};

export const applyBasePriceToProduct = (product: ProductPricingRow, basePrice: number | null): ProductPricingRow => {
  if (typeof basePrice !== "number" || !Number.isFinite(basePrice) || basePrice <= 0) {
    return product;
  }

  return {
    ...product,
    baseSupplyPrice: basePrice,
  };
};

