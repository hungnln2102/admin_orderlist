// ESM schema definitions for frontend usage (no Node globals).

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
    refund: "refund",
  },
};

export const DB_DEFINITIONS = {
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
      note: "note",
      storage: "storage",
      mailFamily: "mail_family",
    },
  },
  warehouse: {
    tableName: "product_stock",
    columns: {
      id: "id",
      category: "product_type",
      account: "account_username",
      password: "account_password",
      backupEmail: "backup_email",
      twoFa: "two_fa_code",
      note: "note",
      status: "stock_status",
      createdAt: "created_at",
    },
  },
  packageProduct: {
    tableName: "package_product",
    columns: {
      id: "id",
      package: "package_name",
      username: "account_user",
      password: "account_pass",
      mail2nd: "recovery_mail",
      note: "note",
      expired: "expiry_date",
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
      shortDesc: "short_desc",
      rules: "rules",
      description: "description",
      imageUrl: "image_url",
    },
  },
  formName: {
    tableName: "form_name",
    columns: {
      id: "id",
      name: "name",
      description: "description",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  formInput: {
    tableName: "form_input",
    columns: {
      id: "id",
      formId: "form_id",
      inputId: "input_id",
      sortOrder: "sort_order",
    },
  },
  inputs: {
    tableName: "inputs",
    columns: {
      id: "id",
      inputName: "input_name",
      inputType: "input_type",
      createdAt: "created_at",
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
    tableName: "supplier_payments",
    columns: {
      id: "id",
      sourceId: "supplier_id",
      importValue: "total_amount",
      round: "payment_period",
      status: "payment_status",
      paid: "amount_paid",
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
      variantId: "variant_id",
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
  // Placeholder
  purchaseOrder: {
    tableName: "purchase_order",
    columns: {},
  },
};

export const ORDER_COLS = DB_DEFINITIONS.orderList.columns;
export const ACCOUNT_STORAGE_COLS = DB_DEFINITIONS.accountStorage.columns;
export const BANK_LIST_COLS = DB_DEFINITIONS.bankList.columns;
export const PACKAGE_PRODUCT_COLS = DB_DEFINITIONS.packageProduct.columns;
export const PAYMENT_RECEIPT_COLS = DB_DEFINITIONS.paymentReceipt.columns;
export const PAYMENT_SUPPLY_COLS = DB_DEFINITIONS.paymentSupply.columns;
export const PRODUCT_PRICE_COLS = DB_DEFINITIONS.productPrice.columns;
export const PRODUCT_DESC_COLS = DB_DEFINITIONS.productDesc.columns;
export const REFUND_COLS = DB_DEFINITIONS.refund.columns;
export const SUPPLY_COLS = DB_DEFINITIONS.supply.columns;
export const SUPPLY_PRICE_COLS = DB_DEFINITIONS.supplyPrice.columns;
export const USERS_COLS = DB_DEFINITIONS.users.columns;
export const WAREHOUSE_COLS = DB_DEFINITIONS.warehouse.columns;

export default {
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
