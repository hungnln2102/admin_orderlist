/**
 * DATABASE CONFIGURATION
 * Single Source of Truth for Tables and Columns
 */

// 1. CẤU HÌNH MÔI TRƯỜNG
const CONFIG = {
  SCHEMA: process.env.DB_SCHEMA || "mavryk",
  NOTIFICATION_GROUP_ID: process.env.NOTIFICATION_GROUP_ID || "-1002934465528",
  RENEWAL_TOPIC_ID: process.env.RENEWAL_TOPIC_ID || 2,
};

// 2. CỘT DÙNG CHUNG (Để tái sử dụng)
const SHARED_COLS = {
  ORDER: {
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
  },
};

// 3. ĐỊNH NGHĨA CHÍNH (Core Definitions)
const DB_DEFINITIONS = {
  // --- Nhóm Order ---
  orderList: { tableName: "order_list", columns: SHARED_COLS.ORDER },
  orderExpired: { tableName: "order_expired", columns: SHARED_COLS.ORDER },
  orderCanceled: { tableName: "order_canceled", columns: SHARED_COLS.ORDER },

  // --- Nhóm Tài khoản & Kho ---
  accountStorage: {
    tableName: "account_storage",
    columns: {
      id: "id",
      username: "username",
      password: "password",
      mail2nd: "Mail 2nd",
      note: "note",
      storage: "storage",
      mailFamily: "Mail Family",
    },
  },
  warehouse: {
    tableName: "warehouse",
    columns: {
      id: "id",
      category: "category",
      account: "account",
      password: "password",
      backupEmail: "backup_email",
      twoFa: "two_fa",
      note: "note",
      status: "status",
      createdAt: "created_at",
    },
  },
  packageProduct: {
    tableName: "package_product",
    columns: {
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
    },
  },

  // --- Nhóm Sản phẩm & Giá ---
  productPrice: {
    tableName: "product_price",
    columns: {
      id: "id",
      product: "san_pham",
      pctCtv: "pct_ctv",
      pctKhach: "pct_khach",
      isActive: "is_active",
      package: "package",
      packageProduct: "package_product",
      updateDate: "update",
      pctPromo: "pct_promo",
    },
  },
  productDesc: {
    tableName: "product_desc",
    columns: {
      id: "id",
      productId: "product_id",
      rules: "rules",
      description: "description",
      imageUrl: "image_url",
    },
  },

  // --- Nhóm Thanh toán ---
  paymentReceipt: {
    tableName: "payment_receipt",
    columns: {
      id: "id",
      orderCode: "ma_don_hang",
      paidDate: "ngay_thanh_toan",
      amount: "so_tien",
      receiver: "nguoi_gui",
      sender: "sender",
      note: "noi_dung_ck",
    },
  },
  paymentSupply: {
    tableName: "payment_supply",
    columns: {
      id: "id",
      sourceId: "source_id",
      importValue: "import",
      round: "round",
      status: "status",
      paid: "paid",
    },
  },
  refund: {
    tableName: "refund",
    columns: {
      id: "id",
      orderCode: "ma_don_hang",
      paidDate: "ngay_thanh_toan",
      amount: "so_tien",
    },
  },
  bankList: {
    tableName: "bank_list",
    columns: {
      bin: "bin",
      bankName: "bank_name",
    },
  },

  // --- Nhóm Supply ---
  supply: {
    tableName: "supply",
    columns: {
      id: "id",
      sourceName: "source_name",
      numberBank: "number_bank",
      binBank: "bin_bank",
      activeSupply: "active_supply",
    },
  },
  supplyPrice: {
    tableName: "supply_price",
    columns: {
      id: "id",
      productId: "product_id",
      sourceId: "source_id",
      price: "price",
    },
  },

  // --- Nhóm Hệ thống ---
  users: {
    tableName: "users",
    columns: {
      userId: "userid",
      username: "username",
      passwordHash: "passwordhash",
      role: "role",
      createdAt: "createdat",
    },
  },
  purchaseOrder: {
    tableName: "purchase_order",
    columns: {},
  },
};

// 4. UTILITIES
const tableNameWithSchema = (name) => `${CONFIG.SCHEMA}.${name}`;

// Tự động tạo map tên bảng đầy đủ: TABLES.users => "mavryk.users"
const TABLES = Object.fromEntries(
  Object.entries(DB_DEFINITIONS).map(([key, def]) => [
    key,
    tableNameWithSchema(def.tableName),
  ])
);

// Convenience column maps (unquoted) for consumers
const ORDER_COLS = DB_DEFINITIONS.orderList.columns;
const PAYMENT_RECEIPT_COLS = DB_DEFINITIONS.paymentReceipt.columns;
const PAYMENT_SUPPLY_COLS = DB_DEFINITIONS.paymentSupply.columns;
const PRODUCT_PRICE_COLS = DB_DEFINITIONS.productPrice.columns;
const SUPPLY_COLS = DB_DEFINITIONS.supply.columns;
const SUPPLY_PRICE_COLS = DB_DEFINITIONS.supplyPrice.columns;

module.exports = {
  ...CONFIG,
  DB_DEFINITIONS, // Cấu trúc dữ liệu chính
  TABLES, // Helper để lấy nhanh tên bảng kèm schema
  tableName: tableNameWithSchema,
  ORDER_COLS,
  PAYMENT_RECEIPT_COLS,
  PAYMENT_SUPPLY_COLS,
  PRODUCT_PRICE_COLS,
  SUPPLY_COLS,
  SUPPLY_PRICE_COLS,
};
