import type { NormalizedOrderRecord, OrderListItem } from "../../utils/packageHelpers";
import {
  buildIdentifierKeys,
  normalizeMatchKey,
  normalizeProductCodeValue,
  normalizeSlotKey,
  toCleanString,
} from "../../utils/packageHelpers";

export const toNormalizedOrderMatchers = (
  orders: OrderListItem[]
): NormalizedOrderRecord[] => {
  return orders.map((order) => {
    const orderRecord = order as Record<string, unknown>;
    const idProduct = (order.id_product ?? order.idProduct ?? "") as string;
    const informationOrder = (order.information_order ?? order.informationOrder ?? "") as string;
    const slot = order.slot;

    const rawLineProductId = orderRecord.line_product_id ?? orderRecord.lineProductId;
    const parsedLineProductId =
      rawLineProductId != null && rawLineProductId !== "" ? Number(rawLineProductId) : NaN;
    const lineProductId =
      Number.isFinite(parsedLineProductId) && parsedLineProductId > 0
        ? parsedLineProductId
        : null;

    const productKeys = buildIdentifierKeys(idProduct);
    const infoKeys = buildIdentifierKeys(informationOrder);

    return {
      base: order,
      productKey: productKeys.normalized,
      productLettersKey: productKeys.lettersOnly,
      infoKey: infoKeys.normalized,
      infoLettersKey: infoKeys.lettersOnly,
      slotDisplay: toCleanString(slot),
      slotKey: normalizeSlotKey(slot),
      slotMatchKey: normalizeMatchKey(slot),
      informationDisplay: toCleanString(informationOrder),
      informationKey: normalizeSlotKey(informationOrder),
      informationMatchKey: normalizeMatchKey(informationOrder),
      customerDisplay: toCleanString(order.customer as string | null),
      productCodeNormalized: normalizeProductCodeValue(idProduct),
      lineProductId,
    };
  });
};

export const groupOrdersByProductCode = (orderMatchers: NormalizedOrderRecord[]) => {
  const map = new Map<string, NormalizedOrderRecord[]>();
  orderMatchers.forEach((record) => {
    if (!record.productCodeNormalized) return;
    const key = record.productCodeNormalized;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(record);
  });
  return map;
};
