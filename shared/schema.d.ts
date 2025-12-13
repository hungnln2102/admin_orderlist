export type ColumnDict = Record<string, string>;

export interface DbDefinition {
  tableName: string;
  columns: ColumnDict;
}

export const DB_DEFINITIONS: Record<string, DbDefinition>;

export const ORDER_COLS: ColumnDict;
export const ACCOUNT_STORAGE_COLS: ColumnDict;
export const BANK_LIST_COLS: ColumnDict;
export const PACKAGE_PRODUCT_COLS: ColumnDict;
export const PAYMENT_RECEIPT_COLS: ColumnDict;
export const PAYMENT_SUPPLY_COLS: ColumnDict;
export const PRODUCT_PRICE_COLS: ColumnDict;
export const PRODUCT_DESC_COLS: ColumnDict;
export const REFUND_COLS: ColumnDict;
export const SUPPLY_COLS: ColumnDict;
export const SUPPLY_PRICE_COLS: ColumnDict;
export const USERS_COLS: ColumnDict;
export const WAREHOUSE_COLS: ColumnDict;
