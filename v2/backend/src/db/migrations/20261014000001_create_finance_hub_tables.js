/**
 * Migration 20261014000001: Create Finance Hub Tables (Fixed Costs, Installments, Personal Assets)
 * Hỗ trợ quản lý Chi phí cố định, Trả góp theo kỳ và Tài sản/Nợ cá nhân.
 */

const schemaFinance = process.env.DB_SCHEMA_FINANCE || process.env.SCHEMA_FINANCE || "finance";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Đảm bảo schema finance tồn tại
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaFinance};`);

  // 0. finance.financial_accounts
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.financial_accounts (
      id integer NOT NULL PRIMARY KEY,
      account_type varchar(20) NOT NULL DEFAULT 'bank',
      label text,
      account_number text NOT NULL,
      account_holder text,
      bank_bin text,
      bank_short_code text,
      bank_display_name text,
      qr_note_prefix text,
      is_default boolean DEFAULT false,
      is_active boolean DEFAULT true,
      total_withdrawn numeric(15,2) DEFAULT 0,
      total_received numeric(15,2) DEFAULT 0,
      balance numeric(15,2) DEFAULT 0,
      is_deleted boolean DEFAULT false,
      created_at timestamp with time zone DEFAULT NOW(),
      updated_at timestamp with time zone DEFAULT NOW()
    );
  `);

  // 1. finance.fixed_costs: Chi phí sinh hoạt & vận hành cố định mỗi tháng
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.fixed_costs (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      category VARCHAR(50) DEFAULT 'LIVING',
      is_active BOOLEAN DEFAULT true,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. finance.installments: Các khoản trả góp / vay định kỳ có số kỳ hạn
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.installments (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      monthly_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      total_periods INT NOT NULL DEFAULT 1,
      start_period VARCHAR(7) NOT NULL, -- Định dạng 'YYYY-MM'
      due_day INT DEFAULT 15,
      status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED'
      is_active BOOLEAN DEFAULT true,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. finance.personal_assets: Sổ tài sản tích lũy & nợ cá nhân bên ngoài shop
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.personal_assets (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'SAVINGS', -- 'SAVINGS', 'CASH_BANK', 'GOLD_INVESTMENT', 'DEBT_PAYABLE', 'DEBT_RECEIVABLE'
      amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_assets CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.installments CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.fixed_costs CASCADE;`);
};
