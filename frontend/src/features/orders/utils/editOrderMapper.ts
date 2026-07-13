import { ORDER_FIELDS, type Order } from "@/constants";
import type { EditableOrder } from "../types";

const toNonNegativeNumber = (value: unknown): number => Number(value ?? 0) || 0;

export const normalizeEditableOrder = (order: Order): EditableOrder => ({
  ...order,
  [ORDER_FIELDS.COST]: toNonNegativeNumber(order[ORDER_FIELDS.COST]),
  [ORDER_FIELDS.PRICE]: toNonNegativeNumber(order[ORDER_FIELDS.PRICE]),
});

export const buildEditOrderPayload = (updatedOrder: EditableOrder): Partial<Order> => ({
  [ORDER_FIELDS.ID_ORDER]: updatedOrder[ORDER_FIELDS.ID_ORDER],
  [ORDER_FIELDS.ID_PRODUCT]: updatedOrder[ORDER_FIELDS.ID_PRODUCT],
  [ORDER_FIELDS.INFORMATION_ORDER]: updatedOrder[ORDER_FIELDS.INFORMATION_ORDER],
  [ORDER_FIELDS.CUSTOMER]: updatedOrder[ORDER_FIELDS.CUSTOMER],
  [ORDER_FIELDS.CONTACT]: updatedOrder[ORDER_FIELDS.CONTACT],
  [ORDER_FIELDS.SLOT]: updatedOrder[ORDER_FIELDS.SLOT],
  [ORDER_FIELDS.SUPPLY]: updatedOrder[ORDER_FIELDS.SUPPLY],
  [ORDER_FIELDS.COST]: toNonNegativeNumber(updatedOrder[ORDER_FIELDS.COST]),
  [ORDER_FIELDS.PRICE]: toNonNegativeNumber(updatedOrder[ORDER_FIELDS.PRICE]),
  [ORDER_FIELDS.NOTE]: updatedOrder[ORDER_FIELDS.NOTE],
  [ORDER_FIELDS.STATUS]: updatedOrder[ORDER_FIELDS.STATUS],
});
