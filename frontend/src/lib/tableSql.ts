// tableSql.ts - Đồng bộ thủ công với backend/dbSchema.js
// Mục đích: Định nghĩa tên cột thực tế trong Database để Frontend mapping đúng.

// 1. ORDER_LIST (Backend: ORDER_LIST)
export const ORDER_COLS = {
  id: "id",
  idOrder: "id_order",
  idProduct: "id_product",
  informationOrder: "information_order",
  customer: "customer",
  contact: "contact",
  slot: "slot",
  orderDate: "order_date",
  days: "days",
  orderExpired: "order_expired", // Khớp với ORDER_EXPIRED trong dbSchema
  supply: "supply",
  cost: "cost",
  price: "price",
  note: "note",
  status: "status",
  checkFlag: "check_flag",
};

// 2. ORDER_EXPIRED (Backend: ORDER_EXPIRED - thêm archived_at)
export const ORDER_EXPIRED_COLS = {
  ...ORDER_COLS,
  archivedAt: "archived_at",
};

// 3. REFUND (Backend: REFUND)
export const REFUND_COLS = {
  id: "id",
  orderCode: "ma_don_hang", // Backend: ORDER_CODE -> ma_don_hang
  paidDate: "ngay_thanh_toan", // Backend: PAID_DATE -> ngay_thanh_toan
  amount: "so_tien", // Backend: AMOUNT -> so_tien
};

// 4. PAYMENT_RECEIPT (Backend: PAYMENT_RECEIPT)
export const PAYMENT_RECEIPT_COLS = {
  id: "id",
  orderCode: "id_order", // Backend: ORDER_CODE -> id_order
  paidDate: "payment_date", // Backend: PAID_DATE -> payment_date
  amount: "amount",
  receiver: "receiver",
  note: "note",
  sender: "sender",
};

// 5. SUPPLY (Backend: SUPPLY)
export const SUPPLY_COLS = {
  id: "id",
  sourceName: "source_name",
  numberBank: "number_bank",
  binBank: "bin_bank",
  activeSupply: "active_supply",
};

// 6. SUPPLY_PRICE (Backend: SUPPLY_PRICE)
export const SUPPLY_PRICE_COLS = {
  id: "id",
  productId: "product_id",
  sourceId: "source_id",
  price: "price",
};

// 7. PRODUCT_PRICE (Backend: PRODUCT_PRICE)
export const PRODUCT_PRICE_COLS = {
  id: "id",
  product: "id_product", // Backend: PRODUCT -> id_product
  pctCtv: "pct_ctv",
  pctKhach: "pct_khach",
  isActive: "is_active",
  package: "package",
  packageProduct: "package_product",
  update: "update",
  pctPromo: "pct_promo",
};

// 8. PRODUCT_DESC (Backend: PRODUCT_DESC)
export const PRODUCT_DESC_COLS = {
  id: "id",
  productId: "product_id",
  rules: "rules",
  description: "description",
  imageUrl: "image_url",
};

// 9. BANK_LIST (Backend: BANK_LIST)
export const BANK_LIST_COLS = {
  bin: "bin",
  bankName: "bank_name",
};

// 10. WAREHOUSE (Backend: WAREHOUSE)
export const WAREHOUSE_COLS = {
  id: "id",
  category: "category",
  account: "account",
  password: "password",
  backupEmail: "backup_email",
  twoFa: "two_fa",
  status: "status",
  note: "note",
  createdAt: "created_at",
};

// 11. ACCOUNT_STORAGE (Backend: ACCOUNT_STORAGE)
export const ACCOUNT_STORAGE_COLS = {
  id: "id",
  username: "username",
  password: "password",
  mail2nd: "mail_2nd",
  mailFamily: "mail_family",
  storage: "storage",
  note: "note",
};

// 12. PACKAGE_PRODUCT (Backend: PACKAGE_PRODUCT)
export const PACKAGE_PRODUCT_COLS = {
  id: "id",
  package: "package",
  username: "username",
  password: "password",
  mail2nd: "mail_2nd",
  note: "note",
  expired: "expired",
  supplier: "supplier",
  cost: "cost",
  slot: "slot",
  match: "match",
};

// 13. PAYMENT_SUPPLY (Backend: PAYMENT_SUPPLY)
export const PAYMENT_SUPPLY_COLS = {
  id: "id",
  sourceId: "source_id",
  importValue: "import", // Backend: IMPORT_VALUE -> import
  round: "round",
  status: "status",
  paid: "paid",
};

// 14. USERS (Backend: USERS)
export const USERS_COLS = {
  userid: "userid", // Backend: ID -> userid
  username: "username",
  passwordhash: "passwordhash", // Backend: PASSWORD -> passwordhash
  role: "role",
  createdat: "createdat",
};

// --- XUẤT KHẨU (EXPORTS) ---

// Danh sách định nghĩa DB (dành cho logic validation nếu cần)
export const DB_DEFINITIONS = {
  ORDER_LIST: "order_list",
  ORDER_EXPIRED: "order_expired",
  ORDER_CANCELED: "order_canceled",
  REFUND: "refund",
  PAYMENT_RECEIPT: "payment_receipt",
  SUPPLY: "supply",
  SUPPLY_PRICE: "supply_price",
  PRODUCT_PRICE: "product_price",
  PRODUCT_DESC: "product_desc",
  BANK_LIST: "bank_list",
  WAREHOUSE: "warehouse",
  ACCOUNT_STORAGE: "account_storage",
  PACKAGE_PRODUCT: "package_product",
  PAYMENT_SUPPLY: "payment_supply",
  USERS: "users",
};

// Gom nhóm tất cả columns để fieldMapper sử dụng
export const SCHEMA_TABLES = {
  ORDER_COLS,
  ORDER_EXPIRED_COLS,
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
  WAREHOUSE_COLS,
};

export type SchemaTables = typeof SCHEMA_TABLES;
