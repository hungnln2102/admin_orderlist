// tableSql.ts - Định nghĩa mapping cột DB cho frontend (cập nhật thủ công khi DB đổi).

// 1. ORDER_LIST (Backend: ORDER_LIST - bảng duy nhất cho mọi đơn hàng)
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
  expiryDate: "expired_at", // ngày hết hạn trong order_list
  idSupply: "supply_id", // DB column - API trả về supply (tên NCC) qua JOIN supplier
  supply: "supply", // Tên NCC (từ API response - backend JOIN supplier trả về)
  cost: "cost",
  price: "price",
  note: "note",
  status: "status",
};

// 2. REFUND (Backend: REFUND)
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

// 5. SUPPLIER (Backend: partner.supplier)
export const SUPPLY_COLS = {
  id: "id",
  sourceName: "supplier_name",
  numberBank: "number_bank",
  binBank: "bin_bank",
  activeSupply: "active_supply",
};

// 6. SUPPLIER_COST (Backend: partner.supplier_cost)
export const SUPPLY_PRICE_COLS = {
  id: "id",
  variantId: "variant_id",
  sourceId: "supplier_id",
  price: "price",
};

// 7. VARIANT_PRICING VIEW (Backend: /api/product-prices -> variant + price_config)
export const VARIANT_PRICING_COLS = {
  id: "id",
  code: "id_product", // alias cho variant.display_name
  packageName: "package", // alias cho product.package_name
  variantName: "package_product", // alias cho variant.variant_name
  pctCtv: "pct_ctv",
  pctKhach: "pct_khach",
  pctPromo: "pct_promo",
  isActive: "is_active",
  updatedAt: "update",
  maxSupplyPrice: "max_supply_price",
};

// 8. PRODUCT_DESC (Backend: PRODUCT_DESC)
export const PRODUCT_DESC_COLS = {
  id: "id",
  // Sau khi gộp bảng product_desc vào variant, productId
  // trên giao diện sẽ dùng display_name của variant.
  productId: "display_name",
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
  category: "product_type",
  account: "account_username",
  password: "account_password",
  backupEmail: "backup_email",
  twoFa: "two_fa_code",
  status: "stock_status",
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
  package: "package_name",
  username: "account_user",
  password: "account_pass",
  mail2nd: "recovery_mail",
  note: "note",
  expired: "expiry_date",
  supplier: "supplier",
  cost: "cost",
  slot: "slot",
  match: "match",
};

// 13. PAYMENT_SUPPLY (Backend: PAYMENT_SUPPLY)
export const PAYMENT_SUPPLY_COLS = {
  id: "id",
  sourceId: "supplier_id",
  importValue: "total_amount", // Backend: IMPORT_VALUE -> total_amount
  round: "payment_period",
  status: "payment_status",
  paid: "amount_paid",
};

// 14. USERS (Backend: USERS)
export const USERS_COLS = {
  userid: "userid", // Backend: ID -> userid
  username: "username",
  passwordhash: "passwordhash", // Backend: PASSWORD -> passwordhash
  role: "role",
  createdat: "createdat",
};

// --- PRODUCT SCHEMA (schema: product) ---
export const CATEGORY_COLS = {
  id: "id",
  name: "name",
  createdAt: "created_at",
};

export const PRODUCT_COLS = {
  id: "id",
  name: "name",
  packageName: "package_name",
  isActive: "is_active",
  updatedAt: "updated_at",
};

export const VARIANT_COLS = {
  id: "id",
  productId: "product_id",
  variantName: "variant_name",
  isActive: "is_active",
  displayName: "display_name",
};

export const PRODUCT_SCHEMA_DESC_COLS = {
  id: "id",
  // Alias mô tả sản phẩm trong schema product: sử dụng display_name của variant.
  productId: "display_name",
  rules: "rules",
  description: "description",
  imageUrl: "image_url",
  updatedAt: "updated_at",
};

export const PRICE_CONFIG_COLS = {
  id: "id",
  variantId: "variant_id",
  pctCtv: "pct_ctv",
  pctKhach: "pct_khach",
  pctPromo: "pct_promo",
  updatedAt: "updated_at",
};

export const SUPPLIER_COST_COLS = {
  id: "id",
  variantId: "variant_id",
  sourceId: "supplier_id",
  price: "price",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

// --- XUẤT KHẨU (EXPORTS) ---

// Danh sách định nghĩa DB (dành cho logic validation nếu cần)
// Lưu ý: Đơn hàng đã gom về 1 bảng duy nhất `order_list`.
// Các tab Hết hạn / Hoàn tiền chỉ là scope/filter trên `order_list`,
// không còn bảng vật lý `order_expired` / `order_canceled`.
export const DB_DEFINITIONS = {
  ORDER_LIST: "order_list",
  REFUND: "refund",
  PAYMENT_RECEIPT: "payment_receipt",
  SUPPLY: "supplier",
  SUPPLY_PRICE: "supplier_cost",
  // Mô tả sản phẩm hiện lưu trực tiếp trên bảng variant
  PRODUCT_DESC: "variant",
  BANK_LIST: "bank_list",
  WAREHOUSE: "product_stock",
  ACCOUNT_STORAGE: "account_storage",
  PACKAGE_PRODUCT: "package_product",
  PAYMENT_SUPPLY: "supplier_payments",
  USERS: "users",
};

export const PRODUCT_DB_DEFINITIONS = {
  CATEGORY: "category",
  PRODUCT: "product",
  VARIANT: "variant",
  // Trước đây là bảng product_desc, hiện đã gộp vào variant
  PRODUCT_DESC: "variant",
  PRICE_CONFIG: "price_config",
  SUPPLIER_COST: "supplier_cost",
};

// Gom nhóm tất cả columns để fieldMapper sử dụng
export const SCHEMA_TABLES = {
  ORDER_COLS,
  ACCOUNT_STORAGE_COLS,
  BANK_LIST_COLS,
  PACKAGE_PRODUCT_COLS,
  PAYMENT_RECEIPT_COLS,
  PAYMENT_SUPPLY_COLS,
  VARIANT_PRICING_COLS,
  PRODUCT_DESC_COLS,
  REFUND_COLS,
  SUPPLY_COLS,
  SUPPLY_PRICE_COLS,
  USERS_COLS,
  WAREHOUSE_COLS,
};

export const PRODUCT_SCHEMA_TABLES = {
  CATEGORY_COLS,
  PRODUCT_COLS,
  VARIANT_COLS,
  PRODUCT_SCHEMA_DESC_COLS,
  PRICE_CONFIG_COLS,
  SUPPLIER_COST_COLS,
};

export type SchemaTables = typeof SCHEMA_TABLES;
export type ProductSchemaTables = typeof PRODUCT_SCHEMA_TABLES;
