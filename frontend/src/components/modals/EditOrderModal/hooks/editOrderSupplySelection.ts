import { getImportPriceBySupplyName } from "@/features/supply/utils/supplierRules";
import { getTodayDMY } from "@/shared/date";
import { ORDER_FIELDS, ORDER_STATUSES } from "../../../../constants";
import type { Order, Supply, SupplyPrice } from "../types";
import { getSupplyName } from "../utils";
import { getCustomerTypeFromIdOrder } from "./editOrderPricingRules";

type EditOrderSupplySelection = {
  supplyName: string;
  normalizedPrice: number;
  shouldRecalculatePrice: boolean;
  productName: string;
  orderTypePrefix: string;
  registerDate: string;
  fallbackCost: number | null;
};

export const getEditOrderSupplySelection = ({
  supplyId,
  formData,
  baseOrder,
  supplies,
  supplyPrices,
}: {
  supplyId: number;
  formData: Order | null;
  baseOrder: Order | null;
  supplies: Supply[];
  supplyPrices: SupplyPrice[];
}): EditOrderSupplySelection => {
  const selected = supplies.find((supply) => supply.id === supplyId);
  const supplyName =
    getSupplyName(selected) ||
    (formData?.[ORDER_FIELDS.SUPPLY as keyof Order] as string) ||
    "";

  const matchedPrice =
    getImportPriceBySupplyName(supplyName, supplyPrices, supplies) ??
    supplyPrices.find((price) => price.source_id === supplyId)?.price ??
    null;
  const normalizedPrice = Number(matchedPrice);
  const statusText = String(formData?.[ORDER_FIELDS.STATUS as keyof Order] ?? "");
  const productName = String(
    formData?.[ORDER_FIELDS.ID_PRODUCT as keyof Order] || ""
  );
  const orderTypePrefix = getCustomerTypeFromIdOrder(
    String(formData?.[ORDER_FIELDS.ID_ORDER as keyof Order] || "")
  );
  const registerDate =
    String(formData?.[ORDER_FIELDS.ORDER_DATE as keyof Order] || "").trim() ||
    getTodayDMY();
  const fallbackCost = baseOrder
    ? Number(baseOrder[ORDER_FIELDS.COST as keyof Order] || 0)
    : null;

  return {
    supplyName,
    normalizedPrice,
    productName,
    orderTypePrefix,
    registerDate,
    fallbackCost,
    shouldRecalculatePrice:
      statusText === ORDER_STATUSES.CHUA_THANH_TOAN &&
      Number.isFinite(supplyId) &&
      supplyId > 0 &&
      Boolean(productName) &&
      Boolean(orderTypePrefix),
  };
};
