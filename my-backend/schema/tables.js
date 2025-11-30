// Centralized schema definitions for core tables
const DEFAULT_NOTIFICATION_GROUP_ID = "-1002934465528";
const DEFAULT_RENEWAL_TOPIC_ID = 2;

const ORDER_COLS = {
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

const ACCOUNT_STORAGE_COLS = {
  id: "id",
  username: "username",
  password: "password",
  mail2nd: "Mail 2nd",
  note: "note",
  storage: "storage",
  mailFamily: "Mail Family",
};

const BANK_LIST_COLS = {
  bin: "bin",
  bankName: "bank_name",
};

const PACKAGE_PRODUCT_COLS = {
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

const PAYMENT_RECEIPT_COLS = {
  id: "id",
  orderCode: "ma_don_hang",
  paidDate: "ngay_thanh_toan",
  amount: "so_tien",
  sender: "nguoi_gui",
  note: "noi_dung_ck",
};

const PAYMENT_SUPPLY_COLS = {
  id: "id",
  sourceId: "source_id",
  importValue: "import",
  round: "round",
  status: "status",
  paid: "paid",
};

const PRODUCT_PRICE_COLS = {
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

const REFUND_COLS = {
  id: "id",
  orderCode: "ma_don_hang",
  paidDate: "ngay_thanh_toan",
  amount: "so_tien",
};

const SUPPLY_COLS = {
  id: "id",
  sourceName: "source_name",
  numberBank: "number_bank",
  binBank: "bin_bank",
  activeSupply: "active_supply",
};

const SUPPLY_PRICE_COLS = {
  id: "id",
  productId: "product_id",
  sourceId: "source_id",
  price: "price",
};

const USERS_COLS = {
  userId: "userid",
  username: "username",
  passwordHash: "passwordhash",
  role: "role",
  createdAt: "createdat",
};

module.exports = {
  ORDER_COLS,
  ACCOUNT_STORAGE_COLS,
  BANK_LIST_COLS,
  PACKAGE_PRODUCT_COLS,
  PAYMENT_RECEIPT_COLS,
  PAYMENT_SUPPLY_COLS,
  PRODUCT_PRICE_COLS,
  REFUND_COLS,
  SUPPLY_COLS,
  SUPPLY_PRICE_COLS,
  USERS_COLS,
  DEFAULT_NOTIFICATION_GROUP_ID,
  DEFAULT_RENEWAL_TOPIC_ID,
};
