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
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
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
    },
  },
};

module.exports = {
  ADMIN_SCHEMA,
  FINANCE_SCHEMA,
};
