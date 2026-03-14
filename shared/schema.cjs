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
    expiryDate: "expired_at",
    supply: "supply",
    cost: "cost",
    price: "price",
    note: "note",
    status: "status",
    refund: "refund",
  },
};

const DB_DEFINITIONS = {
  // Orders (đã gom về một bảng order_list)
  orderList: { tableName: "order_list", columns: SHARED_COLS.ORDER },

  // Warehouse
  warehouse: {
    tableName: "product_stocks",
    columns: {
      id: "id",
      category: "product_type",
      account: "account_username",
      backupEmail: "backup_email",
      passwordEncrypted: "password_encrypted",
      twoFaEncrypted: "two_fa_encrypted",
      status: "status",
      expiresAt: "expires_at",
      isVerified: "is_verified",
      note: "note",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  packageProduct: {
    tableName: "package_product",
    columns: {
      id: "id",
      package: "package_name",
      supplier: "supplier",
      importPrice: "Import",
      slot: "slot",
      match: "match",
      stockId: "stock_id",
      storageId: "storage_id",
      storageTotal: "storage_total",
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
      updatedAt: "updated_at",
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
      createdAt: "created_at",
      updatedAt: "updated_at",
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
