// Frontend-safe schema constants (mirrors my-backend/schema/tables.js)
// Keep in sync with backend when columns change.

type ColumnDict = Record<string, string>;

export const ORDER_COLS: ColumnDict = {
  id: "id",
  idOrder: "id_order",
  idProduct: "id_product",
  informationOrder: "information_order",
  customer: "customer",
  contact: "contact",
  slot: "slot",
  orderDate: "order_date",
  days: "days",
  orderExpired: "order_expired",
  supply: "supply",
  cost: "cost",
  price: "price",
  note: "note",
  status: "status",
  checkFlag: "check_flag",
  refund: "refund",
};

export const ACCOUNT_STORAGE_COLS: ColumnDict = {
  id: "id",
  username: "username",
  password: "password",
  mail2nd: "Mail 2nd",
  note: "note",
  storage: "storage",
  mailFamily: "Mail Family",
};

export const BANK_LIST_COLS: ColumnDict = {
  bin: "bin",
  bankName: "bank_name",
};

export const PACKAGE_PRODUCT_COLS: ColumnDict = {
  id: "id",
  package: "package",
  username: "username",
  password: "password",
  mail2nd: "mail 2nd",
  note: "note",
  expired: "expired",
  supplier: "supplier",
  importPrice: "Import",
  slot: "slot",
  match: "match",
};

export const PAYMENT_RECEIPT_COLS: ColumnDict = {
  id: "id",
  orderCode: "ma_don_hang",
  paidDate: "ngay_thanh_toan",
  amount: "so_tien",
  receiver: "nguoi_gui",
  sender: "sender",
  note: "noi_dung_ck",
};

export const PAYMENT_SUPPLY_COLS: ColumnDict = {
  id: "id",
  sourceId: "source_id",
  importValue: "import",
  round: "round",
  status: "status",
  paid: "paid",
};

export const PRODUCT_PRICE_COLS: ColumnDict = {
  id: "id",
  product: "san_pham",
  pctCtv: "pct_ctv",
  pctKhach: "pct_khach",
  isActive: "is_active",
  package: "package",
  packageProduct: "package_product",
  updateDate: "update",
  pctPromo: "pct_promo",
};

export const PRODUCT_DESC_COLS: ColumnDict = {
  id: "id",
  productId: "product_id",
  rules: "rules",
  description: "description",
  imageUrl: "image_url",
};

export const REFUND_COLS: ColumnDict = {
  id: "id",
  orderCode: "ma_don_hang",
  paidDate: "ngay_thanh_toan",
  amount: "so_tien",
};

export const SUPPLY_COLS: ColumnDict = {
  id: "id",
  sourceName: "source_name",
  numberBank: "number_bank",
  binBank: "bin_bank",
  activeSupply: "active_supply",
};

export const SUPPLY_PRICE_COLS: ColumnDict = {
  id: "id",
  productId: "product_id",
  sourceId: "source_id",
  price: "price",
};

export const USERS_COLS: ColumnDict = {
  userId: "userid",
  username: "username",
  passwordHash: "passwordhash",
  role: "role",
  createdAt: "createdat",
};

export const SCHEMA_TABLES = {
  ORDER_COLS,
  ACCOUNT_STORAGE_COLS,
  BANK_LIST_COLS,
  PACKAGE_PRODUCT_COLS,
  PAYMENT_RECEIPT_COLS,
  PAYMENT_SUPPLY_COLS,
  PRODUCT_PRICE_COLS,
  PRODUCT_DESC_COLS,
  REFUND_COLS,
  SUPPLY_COLS,
  SUPPLY_PRICE_COLS,
  USERS_COLS,
};

export type SchemaTables = typeof SCHEMA_TABLES;
