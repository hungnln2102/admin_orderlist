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
      UPDATED_AT: "updated_at",
    },
  },
};

module.exports = {
  ADMIN_SCHEMA,
  FINANCE_SCHEMA,
};
