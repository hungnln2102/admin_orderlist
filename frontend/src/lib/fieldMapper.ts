// Central mapping between UI-facing field aliases (constants.ts) and
// the schema definitions in tableSql.ts. If a DB column name changes,
// update it in tableSql.ts and the new value will be picked up here.

import {
  ORDER_COLS,
  PRODUCT_PRICE_COLS,
  SUPPLY_COLS,
  SUPPLY_PRICE_COLS,
  PAYMENT_RECEIPT_COLS,
  REFUND_COLS,
  BANK_LIST_COLS,
  WAREHOUSE_COLS,
} from "./tableSql";

// ORDER_FIELDS mapping (constants.ts -> tableSql.ts)
export const ORDER_FIELD_MAP = {
  ID: ORDER_COLS.id,
  ID_ORDER: ORDER_COLS.idOrder,
  ID_PRODUCT: ORDER_COLS.idProduct,
  INFORMATION_ORDER: ORDER_COLS.informationOrder,
  CUSTOMER: ORDER_COLS.customer,
  CONTACT: ORDER_COLS.contact,
  SLOT: ORDER_COLS.slot,
  ORDER_DATE: ORDER_COLS.orderDate,
  DAYS: ORDER_COLS.days,
  ORDER_EXPIRED: ORDER_COLS.orderExpired,
  SUPPLY: ORDER_COLS.supply,
  COST: ORDER_COLS.cost,
  PRICE: ORDER_COLS.price,
  NOTE: ORDER_COLS.note,
  STATUS: ORDER_COLS.status,
  CHECK_FLAG: ORDER_COLS.checkFlag,
  REFUND: ORDER_COLS.refund,
} as const;

// ORDER_EXPIRED_FIELDS mapping (mirrors order_list/order_expired columns)
export const ORDER_EXPIRED_FIELD_MAP = {
  ...ORDER_FIELD_MAP,
} as const;

// PURCHASE_ORDER_FIELDS mapping (subset of ORDER fields)
export const PURCHASE_ORDER_FIELD_MAP = {
  ID: ORDER_COLS.id,
  ID_ORDER: ORDER_COLS.idOrder,
  ID_PRODUCT: ORDER_COLS.idProduct,
  INFORMATION_ORDER: ORDER_COLS.informationOrder,
  SLOT: ORDER_COLS.slot,
  ORDER_DATE: ORDER_COLS.orderDate,
  DAYS: ORDER_COLS.days,
  ORDER_EXPIRED: ORDER_COLS.orderExpired,
  SUPPLY: ORDER_COLS.supply,
  COST: ORDER_COLS.cost,
  STATUS: ORDER_COLS.status,
  CHECK_FLAG: ORDER_COLS.checkFlag,
} as const;

export const PRODUCT_PRICE_FIELD_MAP = {
  ID: PRODUCT_PRICE_COLS.id,
  ID_PRODUCT: PRODUCT_PRICE_COLS.product,
  PCT_CTV: PRODUCT_PRICE_COLS.pctCtv,
  PCT_KHACH: PRODUCT_PRICE_COLS.pctKhach,
  IS_ACTIVE: PRODUCT_PRICE_COLS.isActive,
} as const;

export const SUPPLY_FIELD_MAP = {
  ID: SUPPLY_COLS.id,
  SOURCE_NAME: SUPPLY_COLS.sourceName,
  NUMBER_BANK: SUPPLY_COLS.numberBank,
  BIN_BANK: SUPPLY_COLS.binBank,
  ACTIVE_SUPPLY: SUPPLY_COLS.activeSupply,
} as const;

export const SUPPLY_PRICE_FIELD_MAP = {
  ID: SUPPLY_PRICE_COLS.id,
  PRODUCT_ID: SUPPLY_PRICE_COLS.productId,
  SOURCE_ID: SUPPLY_PRICE_COLS.sourceId,
  PRICE: SUPPLY_PRICE_COLS.price,
} as const;

export const PAYMENT_RECEIPT_FIELD_MAP = {
  ID: PAYMENT_RECEIPT_COLS.id,
  MA_DON_HANG: PAYMENT_RECEIPT_COLS.orderCode,
  NGAY_THANH_TOAN: PAYMENT_RECEIPT_COLS.paidDate,
  SO_TIEN: PAYMENT_RECEIPT_COLS.amount,
  NGUOI_GUI: PAYMENT_RECEIPT_COLS.sender,
  NGUOI_NHAN: PAYMENT_RECEIPT_COLS.receiver,
  NOI_DUNG_CK: PAYMENT_RECEIPT_COLS.note,
} as const;

export const REFUND_FIELD_MAP = {
  ID: REFUND_COLS.id,
  MA_DON_HANG: REFUND_COLS.orderCode,
  NGAY_THU_HOI: REFUND_COLS.paidDate,
  SO_TIEN: REFUND_COLS.amount,
} as const;

export const BANK_LIST_FIELD_MAP = {
  BIN: BANK_LIST_COLS.bin,
  BANK_NAME: BANK_LIST_COLS.bankName,
} as const;

export const WAREHOUSE_FIELD_MAP = {
  ID: WAREHOUSE_COLS.id,
  CATEGORY: WAREHOUSE_COLS.category,
  ACCOUNT: WAREHOUSE_COLS.account,
  PASSWORD: WAREHOUSE_COLS.password,
  BACKUP_EMAIL: WAREHOUSE_COLS.backupEmail,
  TWO_FA: WAREHOUSE_COLS.twoFa,
  NOTE: WAREHOUSE_COLS.note,
  STATUS: WAREHOUSE_COLS.status,
  CREATED_AT: WAREHOUSE_COLS.createdAt,
} as const;

export type OrderFieldKey = keyof typeof ORDER_FIELD_MAP;
export type OrderExpiredFieldKey = keyof typeof ORDER_EXPIRED_FIELD_MAP;
export type PurchaseOrderFieldKey = keyof typeof PURCHASE_ORDER_FIELD_MAP;
export type ProductPriceFieldKey = keyof typeof PRODUCT_PRICE_FIELD_MAP;
export type SupplyFieldKey = keyof typeof SUPPLY_FIELD_MAP;
export type SupplyPriceFieldKey = keyof typeof SUPPLY_PRICE_FIELD_MAP;
export type PaymentReceiptFieldKey = keyof typeof PAYMENT_RECEIPT_FIELD_MAP;
export type RefundFieldKey = keyof typeof REFUND_FIELD_MAP;
export type BankListFieldKey = keyof typeof BANK_LIST_FIELD_MAP;
export type WarehouseFieldKey = keyof typeof WAREHOUSE_FIELD_MAP;
