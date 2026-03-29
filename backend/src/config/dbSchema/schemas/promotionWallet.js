const PROMOTION_SCHEMA = {
  ACCOUNT_PROMOTIONS: {
    TABLE: "account_promotions",
    COLS: {
      ID: "id",
      ACCOUNT_ID: "account_id",
      PROMOTION_ID: "promotion_id",
      STATUS: "status",
      ASSIGNED_AT: "assigned_at",
      USED_AT: "used_at",
      USAGE_LIMIT_PER_USER: "usage_limit_per_user",
    },
  },
  PROMOTION_CODES: {
    TABLE: "promotion_codes",
    COLS: {
      ID: "id",
      CODE: "code",
      DISCOUNT_PERCENT: "discount_percent",
      MAX_DISCOUNT_AMOUNT: "max_discount_amount",
      MIN_ORDER_AMOUNT: "min_order_amount",
      DESCRIPTION: "description",
      STATUS: "status",
      IS_PUBLIC: "is_public",
      USAGE_LIMIT: "usage_limit",
      USED_COUNT: "used_count",
      START_AT: "start_at",
      END_AT: "end_at",
      CREATED_AT: "created_at",
    },
  },
};

const WALLET_SCHEMA = {
  WALLET_TRANSACTIONS: {
    TABLE: "wallet_transactions",
    COLS: {
      ID: "id",
      TRANSACTION_ID: "transaction_id",
      ACCOUNT_ID: "account_id",
      TYPE: "type",
      DIRECTION: "direction",
      AMOUNT: "amount",
      BALANCE_BEFORE: "balance_before",
      BALANCE_AFTER: "balance_after",
      PROMO_CODE: "promo_code",
      CREATED_AT: "created_at",
      METHOD: "method",
      PROMOTION_ID: "promotion_id",
    },
  },
  WALLETS: {
    TABLE: "wallets",
    COLS: {
      ACCOUNT_ID: "account_id",
      BALANCE: "balance",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
};

module.exports = {
  PROMOTION_SCHEMA,
  WALLET_SCHEMA,
};
