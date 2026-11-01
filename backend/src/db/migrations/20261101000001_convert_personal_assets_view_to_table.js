/**
 * Migration: Chuyển đổi finance.personal_assets từ VIEW sang BẢNG THỰC THỂ (Physical Table)
 *
 * Lý do:
 * - finance.personal_assets trước đây là VIEW UNION ALL (personal_savings, personal_investments, personal_debts).
 * - PostgreSQL không cho phép INSERT/UPDATE/DELETE vào VIEW UNION ALL (Lỗi code: 55000).
 * - Các bảng con có ID độc lập gây nguy cơ ID collision.
 * - Thống nhất quản lý toàn bộ tài sản và nợ cá nhân trong bảng finance.personal_assets.
 * - Giữ view tương thích ngược finance.personal_savings cho các logic cần lọc riêng SAVINGS.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const { SCHEMAS } = require("../tables");

exports.up = async function up(knex) {
  const schemaFinance = SCHEMAS.FINANCE || "finance";

  // 1. Xóa VIEW UNION ALL cũ
  await knex.raw(`DROP VIEW IF EXISTS ${schemaFinance}.personal_assets CASCADE;`);

  // 2. Tạo Bảng Thực Thể finance.personal_assets
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.personal_assets (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(30) NOT NULL,
      amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
      note TEXT,
      profit_enabled BOOLEAN DEFAULT false,
      profit_frequency VARCHAR(20) DEFAULT 'MONTHLY',
      annual_interest_rate NUMERIC(5, 2),
      profit_destination VARCHAR(30) DEFAULT 'REINVEST',
      profit_account_id INT,
      profit_credit_time VARCHAR(10) DEFAULT '07:00',
      profit_last_credited_period VARCHAR(10),
      debt_interest_enabled BOOLEAN DEFAULT false,
      debt_interest_frequency VARCHAR(20) DEFAULT 'DAILY',
      debt_annual_interest_rate NUMERIC(5, 2),
      debt_due_day INT,
      debt_end_date DATE,
      debt_repayment_frequency VARCHAR(20) DEFAULT 'MONTHLY',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Di chuyển dữ liệu cũ nếu có
  const hasSavings = await knex.schema.withSchema(schemaFinance).hasTable("personal_savings");
  if (hasSavings) {
    const hasPeriodCol = await knex.schema.withSchema(schemaFinance).hasColumn("personal_savings", "profit_last_credited_period");
    await knex.raw(`
      INSERT INTO ${schemaFinance}.personal_assets (
        name, type, amount, note, profit_enabled, profit_frequency, annual_interest_rate,
        profit_destination, profit_account_id, profit_credit_time, profit_last_credited_period,
        created_at, updated_at
      )
      SELECT
        name, 'SAVINGS', amount, note, profit_enabled, profit_frequency, annual_interest_rate,
        profit_destination, profit_account_id, profit_credit_time,
        ${hasPeriodCol ? "profit_last_credited_period" : "NULL::varchar"},
        created_at, updated_at
      FROM ${schemaFinance}.personal_savings;
    `);
  }

  const hasInvestments = await knex.schema.withSchema(schemaFinance).hasTable("personal_investments");
  if (hasInvestments) {
    await knex.raw(`
      INSERT INTO ${schemaFinance}.personal_assets (
        name, type, amount, note, created_at, updated_at
      )
      SELECT
        name, 'GOLD_INVESTMENT', amount, note, created_at, updated_at
      FROM ${schemaFinance}.personal_investments;
    `);
  }

  const hasDebts = await knex.schema.withSchema(schemaFinance).hasTable("personal_debts");
  if (hasDebts) {
    await knex.raw(`
      INSERT INTO ${schemaFinance}.personal_assets (
        name, type, amount, note, debt_interest_enabled, debt_interest_frequency,
        debt_annual_interest_rate, debt_due_day, debt_end_date, debt_repayment_frequency,
        created_at, updated_at
      )
      SELECT
        name, type, amount, note, debt_interest_enabled, debt_interest_frequency,
        debt_annual_interest_rate, debt_due_day, debt_end_date, debt_repayment_frequency,
        created_at, updated_at
      FROM ${schemaFinance}.personal_debts;
    `);
  }

  // 4. Xóa các bảng con riêng lẻ không còn sử dụng
  if (hasInvestments) {
    await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_investments CASCADE;`);
  }
  if (hasDebts) {
    await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_debts CASCADE;`);
  }
  if (hasSavings) {
    await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_savings CASCADE;`);
  }

  // 5. Tạo VIEW tương thích ngược updatable cho personal_savings
  await knex.raw(`
    CREATE OR REPLACE VIEW ${schemaFinance}.personal_savings AS
    SELECT * FROM ${schemaFinance}.personal_assets WHERE type = 'SAVINGS';
  `);
};

exports.down = async function down(knex) {
  const schemaFinance = SCHEMAS.FINANCE || "finance";

  await knex.raw(`DROP VIEW IF EXISTS ${schemaFinance}.personal_savings CASCADE;`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.personal_savings (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
      note TEXT,
      profit_enabled BOOLEAN DEFAULT false,
      profit_frequency VARCHAR(20) DEFAULT 'MONTHLY',
      annual_interest_rate NUMERIC(5, 2),
      profit_destination VARCHAR(30) DEFAULT 'REINVEST',
      profit_account_id INT,
      profit_credit_time VARCHAR(10) DEFAULT '07:00',
      profit_last_credited_period VARCHAR(10),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaFinance}.personal_investments (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaFinance}.personal_debts (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(30) NOT NULL,
      amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
      note TEXT,
      debt_interest_enabled BOOLEAN DEFAULT false,
      debt_interest_frequency VARCHAR(20) DEFAULT 'DAILY',
      debt_annual_interest_rate NUMERIC(5, 2),
      debt_due_day INT,
      debt_end_date DATE,
      debt_repayment_frequency VARCHAR(20) DEFAULT 'MONTHLY',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_assets CASCADE;`);

  await knex.raw(`
    CREATE OR REPLACE VIEW ${schemaFinance}.personal_assets AS
    SELECT id, name, 'SAVINGS' AS type, amount, note, profit_enabled, profit_frequency, annual_interest_rate, profit_destination, profit_account_id, profit_credit_time, false AS debt_interest_enabled, null::varchar AS debt_interest_frequency, null::numeric AS debt_annual_interest_rate, null::integer AS debt_due_day, null::date AS debt_end_date, null::varchar AS debt_repayment_frequency, created_at, updated_at FROM ${schemaFinance}.personal_savings
    UNION ALL
    SELECT id, name, 'GOLD_INVESTMENT' AS type, amount, note, false AS profit_enabled, null::varchar AS profit_frequency, null::numeric AS annual_interest_rate, null::varchar AS profit_destination, null::integer AS profit_account_id, null::varchar AS profit_credit_time, false AS debt_interest_enabled, null::varchar AS debt_interest_frequency, null::numeric AS debt_annual_interest_rate, null::integer AS debt_due_day, null::date AS debt_end_date, null::varchar AS debt_repayment_frequency, created_at, updated_at FROM ${schemaFinance}.personal_investments
    UNION ALL
    SELECT id, name, type, amount, note, false AS profit_enabled, null::varchar AS profit_frequency, null::numeric AS annual_interest_rate, null::varchar AS profit_destination, null::integer AS profit_account_id, null::varchar AS profit_credit_time, debt_interest_enabled, debt_interest_frequency, debt_annual_interest_rate, debt_due_day, debt_end_date, debt_repayment_frequency, created_at, updated_at FROM ${schemaFinance}.personal_debts;
  `);
};
