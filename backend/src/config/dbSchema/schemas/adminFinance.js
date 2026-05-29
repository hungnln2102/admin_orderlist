const ADMIN_SCHEMA = {
  USERS: {
    TABLE: "users",
    COLS: {
      ID: "userid",
      USERNAME: "username",
      PASSWORD: "passwordhash",
      ROLE: "role",
      CREATED_AT: "createdat",
    },
  },
  IP_WHITELISTS: {
    TABLE: "ip_whitelist",
    COLS: {
      ID: "id",
      IP_ADDRESS: "ip_address",
      LABEL: "label",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
  SITE_SETTINGS: {
    TABLE: "site_settings",
    COLS: {
      KEY: "key",
      VALUE: "value",
      UPDATED_AT: "updated_at",
    },
  },
  SHOP_BANK_ACCOUNTS: {
    TABLE: "shop_bank_accounts",
    COLS: {
      ID: "id",
      LABEL: "label",
      ACCOUNT_NUMBER: "account_number",
      ACCOUNT_HOLDER: "account_holder",
      BANK_BIN: "bank_bin",
      BANK_SHORT_CODE: "bank_short_code",
      BANK_DISPLAY_NAME: "bank_display_name",
      QR_NOTE_PREFIX: "qr_note_prefix",
      IS_DEFAULT: "is_default",
      IS_ACTIVE: "is_active",
      TOTAL_WITHDRAWN: "total_withdrawn",
      TOTAL_RECEIVED: "total_received",
      BALANCE: "balance",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
  SHOP_BANK_ACCOUNT_LEDGER: {
    TABLE: "shop_bank_account_ledger",
    COLS: {
      ID: "id",
      SHOP_BANK_ACCOUNT_ID: "shop_bank_account_id",
      ENTRY_TYPE: "entry_type",
      AMOUNT: "amount",
      SIGNED_AMOUNT: "signed_amount",
      BALANCE_AFTER: "balance_after",
      SOURCE_KIND: "source_kind",
      SOURCE_ID: "source_id",
      NOTE: "note",
      CREATED_AT: "created_at",
    },
  },
  USDT_WALLETS: {
    TABLE: "usdt_wallets",
    COLS: {
      ID: "id",
      LABEL: "label",
      WALLET_ADDRESS: "wallet_address",
      NETWORK: "network",
      IS_DEFAULT: "is_default",
      IS_ACTIVE: "is_active",
      TOTAL_RECEIVED: "total_received",
      TOTAL_WITHDRAWN: "total_withdrawn",
      BALANCE: "balance",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
  USDT_WALLET_LEDGER: {
    TABLE: "usdt_wallet_ledger",
    COLS: {
      ID: "id",
      USDT_WALLET_ID: "usdt_wallet_id",
      ENTRY_TYPE: "entry_type",
      AMOUNT: "amount",
      SIGNED_AMOUNT: "signed_amount",
      BALANCE_AFTER: "balance_after",
      SOURCE_KIND: "source_kind",
      SOURCE_ID: "source_id",
      EXCHANGE_RATE: "exchange_rate",
      VND_EQUIVALENT: "vnd_equivalent",
      NOTE: "note",
      CREATED_AT: "created_at",
    },
  },
};

const FINANCE_SCHEMA = {
  MASTER_WALLETTYPES: {
    TABLE: "master_wallettypes",
    COLS: {
      ID: "id",
      WALLET_NAME: "wallet_name",
      NOTE: "note",
      ASSET_CODE: "asset_code",
      IS_INVESTMENT: "is_investment",
      LINKED_WALLET_ID: "linked_wallet_id",
      BALANCE_SCOPE: "balance_scope",
    },
  },
  TRANS_DAILYBALANCES: {
    TABLE: "trans_dailybalances",
    COLS: {
      ID: "id",
      RECORD_DATE: "record_date",
      WALLET_ID: "wallet_id",
      AMOUNT: "amount",
    },
  },
  SAVING_GOALS: {
    TABLE: "saving_goals",
    COLS: {
      ID: "id",
      GOAL_NAME: "goal_name",
      TARGET_AMOUNT: "target_amount",
      PRIORITY: "priority",
      CREATED_AT: "created_at",
    },
  },
  DASHBOARD_MONTHLY_SUMMARY: {
    TABLE: "dashboard_monthly_summary",
    COLS: {
      MONTH_KEY: "month_key",
      TOTAL_ORDERS: "total_orders",
      CANCELED_ORDERS: "canceled_orders",
      TOTAL_REVENUE: "total_revenue",
      TOTAL_PROFIT: "total_profit",
      TOTAL_REFUND: "total_refund",
      /** Tổng import_cost từ partner.supplier_order_cost_log theo tháng (logged_at). */
      TOTAL_IMPORT: "total_import",
      /** Ước tính thuế theo tháng (theo DASHBOARD_MONTHLY_TAX_RATE_PERCENT trên total_revenue). */
      TOTAL_TAX: "total_tax",
      /**
       * Tiền NH nhận ngoài luồng doanh thu: webhook không mã đơn, và tiền thừa sau khi đơn đã PAID.
       */
      TOTAL_OFF_FLOW_BANK_RECEIPT: "total_off_flow_bank_receipt",
      /**
       * Số dư bank ước tính (tiền lưu động): cộng/trừ trực tiếp theo luồng in/out thực tế.
       */
      ESTIMATED_BANK_BALANCE: "estimated_bank_balance",
      UPDATED_AT: "updated_at",
    },
  },
  /** Tổng hợp theo ngày: earned / unearned cuối ngày / đảo chiều — nguồn ghi do job hoặc sync sau này. */
  DAILY_REVENUE_SUMMARY: {
    TABLE: "daily_revenue_summary",
    COLS: {
      SUMMARY_DATE: "summary_date",
      EARNED_REVENUE: "earned_revenue",
      UNEARNED_REVENUE_END: "unearned_revenue_end",
      REVENUE_REVERSED: "revenue_reversed",
      /** Nhập (mavn/external): phân bổ amount/term theo đơn hoặc N ngày từ created_at; withdraw_profit: cả khoản vào ngày created_at. */
      TOTAL_SHOP_COST: "total_shop_cost",
      /** Σ((price−cost)/term) đơn MAVC/L/K/S — khớp TaxDailyFormTable metric «profit». */
      ALLOCATED_PROFIT_TAX: "allocated_profit_tax",
      /**
       * Đơn đếm trên biểu đồ dashboard: birth_date = ngày, status trong nhóm «đang trong sổ bán», birth ≥ tax_from (backfill).
       */
      DASHBOARD_ORDERS_COUNT: "dashboard_orders_count",
      /** Đơn hủy/hoàn: canceled_at ngày, status Chưa/Đã hoàn, canceled ≥ tax_from. */
      DASHBOARD_CANCELED_COUNT: "dashboard_canceled_count",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
  /** Log biến động tài chính dashboard theo tháng (append-only, phục vụ đối soát/audit). */
  DASHBOARD_FINANCIAL_CHANGE_LOG: {
    TABLE: "dashboard_financial_change_log",
    COLS: {
      ID: "id",
      MONTH_KEY: "month_key",
      REVENUE_DELTA: "revenue_delta",
      PROFIT_DELTA: "profit_delta",
      IMPORT_DELTA: "import_delta",
      REFUND_DELTA: "refund_delta",
      OFF_FLOW_DELTA: "off_flow_delta",
      BANK_BALANCE_DELTA: "bank_balance_delta",
      TAX_SNAPSHOT: "tax_snapshot",
      OFF_FLOW_SNAPSHOT: "off_flow_snapshot",
      BANK_BALANCE_SNAPSHOT: "bank_balance_snapshot",
      // Legacy column kept for backward compatibility with old migrations/data.
      AVAILABLE_PROFIT_SNAPSHOT: "available_profit_snapshot",
      CONTEXT: "context",
      CREATED_AT: "created_at",
    },
  },
  STORE_PROFIT_EXPENSES: {
    TABLE: "store_profit_expenses",
    COLS: {
      ID: "id",
      AMOUNT: "amount",
      REASON: "reason",
      EXPENSE_TYPE: "expense_type",
      CREATED_AT: "created_at",
      /** Gắn mã đơn MAVN khi `expense_type = mavn_import` (migration 088). */
      LINKED_ORDER_CODE: "linked_order_code",
      EXPENSE_META: "expense_meta",
      SHOP_BANK_ACCOUNT_ID: "shop_bank_account_id",
    },
  },
};

module.exports = {
  ADMIN_SCHEMA,
  FINANCE_SCHEMA,
};
