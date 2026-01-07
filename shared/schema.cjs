// Shared database schema definitions (frontend + backend)
// Pure data: no environment access, no Node-only APIs.

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

const DB_DEFINITIONS = {
  // Orders
  orderList: { tableName: "order_list", columns: SHARED_COLS.ORDER },
  orderExpired: { tableName: "order_expired", columns: SHARED_COLS.ORDER },
  orderCanceled: { tableName: "order_canceled", columns: SHARED_COLS.ORDER },

  // Accounts & warehouse
  accountStorage: {
    tableName: "account_storage",
    columns: {
      id: "id",
      username: "username",
      password: "password",
      mail2nd: "mail_2nd",
      mailFamily: "mail_family",
      storage: "storage",
      note: "note",
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

  // Products
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

  // Payments
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

  // Supplier (partner schema)
  supply: {
    tableName: "supplier",
    columns: {
      id: "id",
      sourceName: "source_name",
      numberBank: "number_bank",
      binBank: "bin_bank",
      activeSupply: "active_supply",
    },
  },
  supplyPrice: {
    tableName: "supplier_cost",
    columns: {
      id: "id",
      productId: "product_id",
      sourceId: "supplier_id",
      price: "price",
    },
  },

  // Users
  users: {
    tableName: "users",
    columns: {
      id: "userid",
      username: "username",
      password: "passwordhash",
      role: "role",
      createdAt: "createdat",
    },
  },

  // Placeholder for future use
  purchaseOrder: {
    tableName: "purchase_order",
    columns: {},
  },
};

const ORDER_COLS = DB_DEFINITIONS.orderList.columns;
const ACCOUNT_STORAGE_COLS = DB_DEFINITIONS.accountStorage.columns;
const BANK_LIST_COLS = DB_DEFINITIONS.bankList.columns;
const PACKAGE_PRODUCT_COLS = DB_DEFINITIONS.packageProduct.columns;
const PAYMENT_RECEIPT_COLS = DB_DEFINITIONS.paymentReceipt.columns;
const PAYMENT_SUPPLY_COLS = DB_DEFINITIONS.paymentSupply.columns;
const PRODUCT_PRICE_COLS = DB_DEFINITIONS.productPrice.columns;
const PRODUCT_DESC_COLS = DB_DEFINITIONS.productDesc.columns;
const REFUND_COLS = DB_DEFINITIONS.refund.columns;
const SUPPLY_COLS = DB_DEFINITIONS.supply.columns;
const SUPPLY_PRICE_COLS = DB_DEFINITIONS.supplyPrice.columns;
const USERS_COLS = DB_DEFINITIONS.users.columns;
const WAREHOUSE_COLS = DB_DEFINITIONS.warehouse.columns;

module.exports = {
  DB_DEFINITIONS,
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
  WAREHOUSE_COLS,
};
