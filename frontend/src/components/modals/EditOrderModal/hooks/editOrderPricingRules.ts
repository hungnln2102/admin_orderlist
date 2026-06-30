import { DEFAULT_ORDER_CODE_PREFIX, ORDER_CODE_PREFIXES } from "../../../../constants";
import { resolveOrderType } from "@/features/bill-order/helpers";
import type { CustomerType } from "../../CreateOrderModal/types";

export const getCustomerTypeFromIdOrder = (idOrder: string): CustomerType => {
  const upper = String(idOrder || "").trim().toUpperCase();
  if (upper.startsWith(ORDER_CODE_PREFIXES.IMPORT)) {
    return ORDER_CODE_PREFIXES.IMPORT;
  }
  return resolveOrderType(idOrder) ?? DEFAULT_ORDER_CODE_PREFIX;
};

export const mergeCurrentProductOption = (
  baseOptions: string[],
  currentProduct: string
): string[] => {
  if (!currentProduct.trim()) return baseOptions;
  if (baseOptions.some((item) => item === currentProduct)) return baseOptions;
  return [currentProduct, ...baseOptions];
};
