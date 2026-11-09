const FINANCE_SCHEMA = process.env.DB_SCHEMA_FINANCE || "finance";

const DEFAULT_CATEGORIES = [
  ["FOOD_DRINK", "Ăn uống & Cafe", "Utensils", "amber", 1, ["highlands", "coffee", "grabfood", "shopeefood"]],
  ["SHOPPING", "Mua sắm cá nhân", "ShoppingBag", "pink", 2, ["shopee", "lazada", "tiki"]],
  ["TRANSPORT", "Đi lại & Xăng xe", "Car", "blue", 3, ["grab", "be", "petrolimex"]],
  ["HOME", "Nhà cửa & Hóa đơn", "Home", "indigo", 4, ["evn", "internet", "viettel", "fpt"]],
  ["HEALTH", "Sức khỏe & Y tế", "HeartPulse", "rose", 5, ["pharmacy", "pharmacity", "gym"]],
  ["DIGITAL_SERVICES", "Dịch vụ số / Tech", "Laptop", "cyan", 6, ["openai", "netflix", "spotify", "google"]],
  ["REFUND_INCOME", "Thu nhập & Hoàn tiền", "TrendingUp", "emerald", 7, ["refund", "hoàn tiền", "lương"]],
  ["OTHER", "Khác", "Tag", "slate", 99, []],
];

exports.up = async function up(knex) {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.personal_spending_categories (
      id BIGSERIAL PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      icon VARCHAR(64),
      color VARCHAR(32),
      monthly_budget NUMERIC(15, 2),
      keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ${FINANCE_SCHEMA}.personal_debit_transaction_logs (
      id BIGSERIAL PRIMARY KEY,
      financial_account_id BIGINT NOT NULL REFERENCES ${FINANCE_SCHEMA}.financial_accounts(id) ON DELETE RESTRICT,
      category_id BIGINT REFERENCES ${FINANCE_SCHEMA}.personal_spending_categories(id) ON DELETE SET NULL,
      financial_account_ledger_id BIGINT UNIQUE REFERENCES ${FINANCE_SCHEMA}.financial_account_ledger(id) ON DELETE RESTRICT,
      instrument_mask VARCHAR(32),
      occurred_at TIMESTAMPTZ NOT NULL,
      direction VARCHAR(16) NOT NULL CHECK (direction IN ('INFLOW', 'OUTFLOW')),
      amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      merchant_normalized VARCHAR(255) NOT NULL,
      category_source VARCHAR(16) NOT NULL DEFAULT 'UNCLASSIFIED' CHECK (category_source IN ('RULE', 'MANUAL', 'UNCLASSIFIED')),
      observed_balance_after NUMERIC(15, 2),
      balance_projection_status VARCHAR(40) NOT NULL DEFAULT 'PROJECTED_APPLIED' CHECK (balance_projection_status IN ('PROJECTED_APPLIED', 'OBSERVED_APPLIED', 'RECONCILIATION_ADJUSTED', 'LATE_ALREADY_COVERED', 'BALANCE_UNVERIFIED')),
      business_key VARCHAR(255),
      source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
      note TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_personal_debit_transaction_business_key
      ON ${FINANCE_SCHEMA}.personal_debit_transaction_logs(financial_account_id, business_key)
      WHERE business_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_personal_debit_transactions_account_occurred
      ON ${FINANCE_SCHEMA}.personal_debit_transaction_logs(financial_account_id, occurred_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_personal_debit_transactions_category_occurred
      ON ${FINANCE_SCHEMA}.personal_debit_transaction_logs(category_id, occurred_at DESC, id DESC);
  `);

  for (const [code, name, icon, color, sortOrder, keywords] of DEFAULT_CATEGORIES) {
    await knex.raw(
      `INSERT INTO ${FINANCE_SCHEMA}.personal_spending_categories (code, name, icon, color, sort_order, keywords)
       VALUES (?, ?, ?, ?, ?, ?::jsonb)
       ON CONFLICT (code) DO NOTHING`,
      [code, name, icon, color, sortOrder, JSON.stringify(keywords)]
    );
  }
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.personal_debit_transaction_logs;
    DROP TABLE IF EXISTS ${FINANCE_SCHEMA}.personal_spending_categories;
  `);
};
