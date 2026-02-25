// Central mapping between UI-facing field aliases (constants.ts) and
// the schema definitions in tableSql.ts. Nếu đổi tên cột DB, sửa ở tableSql.ts.

import {
  ORDER_COLS,
  VARIANT_PRICING_COLS,
  SUPPLY_COLS,
  SUPPLY_PRICE_COLS,
  PAYMENT_RECEIPT_COLS,
  REFUND_COLS,
  BANK_LIST_COLS,
  WAREHOUSE_COLS,
  CATEGORY_COLS,
  PRODUCT_COLS,
  VARIANT_COLS,
  PRODUCT_SCHEMA_DESC_COLS,
  PRICE_CONFIG_COLS,
  SUPPLIER_COST_COLS,
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
} as const;

export const VARIANT_PRICING_FIELD_MAP = {
  ID: VARIANT_PRICING_COLS.id,
  CODE: VARIANT_PRICING_COLS.code,
  PACKAGE_NAME: VARIANT_PRICING_COLS.packageName,
  VARIANT_NAME: VARIANT_PRICING_COLS.variantName,
  PCT_CTV: VARIANT_PRICING_COLS.pctCtv,
  PCT_KHACH: VARIANT_PRICING_COLS.pctKhach,
  PCT_PROMO: VARIANT_PRICING_COLS.pctPromo,
  IS_ACTIVE: VARIANT_PRICING_COLS.isActive,
  UPDATED_AT: VARIANT_PRICING_COLS.updatedAt,
  MAX_SUPPLY_PRICE: VARIANT_PRICING_COLS.maxSupplyPrice,
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
  VARIANT_ID: SUPPLY_PRICE_COLS.variantId,
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

// PRODUCT schema mappings
export const CATEGORY_FIELD_MAP = {
  ID: CATEGORY_COLS.id,
  NAME: CATEGORY_COLS.name,
  CREATED_AT: CATEGORY_COLS.createdAt,
} as const;

export const PRODUCT_FIELD_MAP = {
  ID: PRODUCT_COLS.id,
  PACKAGE_NAME: PRODUCT_COLS.packageName,
} as const;

export const VARIANT_FIELD_MAP = {
  ID: VARIANT_COLS.id,
  PRODUCT_ID: VARIANT_COLS.productId,
  VARIANT_NAME: VARIANT_COLS.variantName,
  IS_ACTIVE: VARIANT_COLS.isActive,
  DISPLAY_NAME: VARIANT_COLS.displayName,
} as const;

export const PRODUCT_SCHEMA_DESC_FIELD_MAP = {
  ID: PRODUCT_SCHEMA_DESC_COLS.id,
  PRODUCT_ID: PRODUCT_SCHEMA_DESC_COLS.productId,
  RULES: PRODUCT_SCHEMA_DESC_COLS.rules,
  DESCRIPTION: PRODUCT_SCHEMA_DESC_COLS.description,
  IMAGE_URL: PRODUCT_SCHEMA_DESC_COLS.imageUrl,
} as const;

export const PRICE_CONFIG_FIELD_MAP = {
  ID: PRICE_CONFIG_COLS.id,
  VARIANT_ID: PRICE_CONFIG_COLS.variantId,
  PCT_CTV: PRICE_CONFIG_COLS.pctCtv,
  PCT_KHACH: PRICE_CONFIG_COLS.pctKhach,
  PCT_PROMO: PRICE_CONFIG_COLS.pctPromo,
  UPDATED_AT: PRICE_CONFIG_COLS.updatedAt,
} as const;

export const SUPPLIER_COST_FIELD_MAP = {
  ID: SUPPLIER_COST_COLS.id,
  VARIANT_ID: SUPPLIER_COST_COLS.variantId,
  SOURCE_ID: SUPPLIER_COST_COLS.sourceId,
  PRICE: SUPPLIER_COST_COLS.price,
} as const;

export type OrderFieldKey = keyof typeof ORDER_FIELD_MAP;
export type OrderExpiredFieldKey = keyof typeof ORDER_EXPIRED_FIELD_MAP;
export type PurchaseOrderFieldKey = keyof typeof PURCHASE_ORDER_FIELD_MAP;
export type VariantPricingFieldKey = keyof typeof VARIANT_PRICING_FIELD_MAP;
export type SupplyFieldKey = keyof typeof SUPPLY_FIELD_MAP;
export type SupplyPriceFieldKey = keyof typeof SUPPLY_PRICE_FIELD_MAP;
export type PaymentReceiptFieldKey = keyof typeof PAYMENT_RECEIPT_FIELD_MAP;
export type RefundFieldKey = keyof typeof REFUND_FIELD_MAP;
export type BankListFieldKey = keyof typeof BANK_LIST_FIELD_MAP;
export type WarehouseFieldKey = keyof typeof WAREHOUSE_FIELD_MAP;
export type CategoryFieldKey = keyof typeof CATEGORY_FIELD_MAP;
export type ProductFieldKey = keyof typeof PRODUCT_FIELD_MAP;
export type VariantFieldKey = keyof typeof VARIANT_FIELD_MAP;
export type ProductSchemaDescFieldKey = keyof typeof PRODUCT_SCHEMA_DESC_FIELD_MAP;
export type PriceConfigFieldKey = keyof typeof PRICE_CONFIG_FIELD_MAP;
export type SupplierCostFieldKey = keyof typeof SUPPLIER_COST_FIELD_MAP;
