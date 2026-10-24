/**
 * Migration 20261018000001: V2 Complete Consolidated Schema
 * Hợp nhất toàn bộ các bảng, schema, cột, chỉ mục, view và seed config của hệ thống V2 thành một nguồn duy nhất (Fresh Production Base).
 */

const schemaBusiness = process.env.DB_SCHEMA_BUSINESS || "business";
const schemaOrders = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || schemaBusiness;
const schemaPartner = process.env.DB_SCHEMA_PARTNER || process.env.SCHEMA_PARTNER || schemaBusiness;
const schemaProduct = process.env.DB_SCHEMA_PRODUCT || process.env.SCHEMA_PRODUCT || schemaBusiness;
const schemaReceipt = process.env.DB_SCHEMA_RECEIPT || process.env.SCHEMA_RECEIPT || "billing";
const schemaAdmin = process.env.DB_SCHEMA_ADMIN || process.env.SCHEMA_ADMIN || "admin";
const schemaSystem = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
const schemaWarehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
const schemaFinance = process.env.DB_SCHEMA_FINANCE || process.env.SCHEMA_FINANCE || "finance";
const schemaDashboard = process.env.DB_SCHEMA_DASHBOARD || schemaFinance;

exports.up = async function (knex) {
  // ==========================================
  // 1. CREATE SCHEMAS
  // ==========================================
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaOrders};`);
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaPartner};`);
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaProduct};`);
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaReceipt};`);
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaAdmin};`);
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaSystem};`);
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaWarehouse};`);
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaFinance};`);
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${schemaDashboard};`);

  // ==========================================
  // 2. BUSINESS SCHEMA (ORDERS, SUPPLIERS & PRODUCTS)
  // ==========================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaOrders}.order_list (
      id BIGSERIAL PRIMARY KEY,
      id_order VARCHAR(100),
      id_product VARCHAR(100),
      information_order TEXT,
      customer VARCHAR(255),
      contact VARCHAR(255),
      slot VARCHAR(255),
      order_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      days INT DEFAULT 30,
      expired_at TIMESTAMPTZ,
      supply_id BIGINT,
      cost NUMERIC(15, 2) DEFAULT 0,
      price NUMERIC(15, 2) DEFAULT 0,
      note TEXT,
      status VARCHAR(50) DEFAULT 'UNPAID',
      was_paid BOOLEAN DEFAULT false,
      refund NUMERIC(15, 2) DEFAULT 0,
      canceled_at TIMESTAMPTZ,
      gross_selling_price NUMERIC(15, 2) DEFAULT 0,
      transaction VARCHAR(100),
      payment_method VARCHAR(50),
      usdt_amount_usd NUMERIC(15, 2) DEFAULT 0,
      usdt_exchange_rate NUMERIC(15, 2) DEFAULT 0,
      usdt_wallet_id BIGINT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaPartner}.supplier (
      id BIGSERIAL PRIMARY KEY,
      supplier_name VARCHAR(255) NOT NULL,
      number_bank VARCHAR(50),
      bin_bank VARCHAR(50),
      account_holder VARCHAR(255),
      active_supply BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaPartner}.supplier_order_cost_log (
      id BIGSERIAL PRIMARY KEY,
      order_list_id BIGINT REFERENCES ${schemaOrders}.order_list(id) ON DELETE CASCADE,
      supply_id BIGINT REFERENCES ${schemaPartner}.supplier(id) ON DELETE SET NULL,
      id_order VARCHAR(100),
      import_cost NUMERIC(15, 2) DEFAULT 0,
      refund_amount NUMERIC(15, 2) DEFAULT 0,
      ncc_payment_status VARCHAR(30) DEFAULT 'UNPAID',
      logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaProduct}.product (
      id BIGSERIAL PRIMARY KEY,
      package_name VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      package_requires_activation BOOLEAN DEFAULT false,
      image_url TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaProduct}.variant (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT REFERENCES ${schemaProduct}.product(id) ON DELETE CASCADE,
      variant_name VARCHAR(255),
      display_name VARCHAR(255),
      base_price NUMERIC(15, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      form_id VARCHAR(100),
      image_url TEXT,
      id_desc VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaProduct}.variant_price (
      variant_id BIGINT REFERENCES ${schemaProduct}.variant(id) ON DELETE CASCADE,
      tier_id INT NOT NULL,
      price NUMERIC(15, 2) DEFAULT 0,
      margin_ratio NUMERIC(5, 2) DEFAULT 0,
      PRIMARY KEY (variant_id, tier_id)
    );

    CREATE TABLE IF NOT EXISTS ${schemaProduct}.supplier_cost (
      id BIGSERIAL PRIMARY KEY,
      variant_id BIGINT REFERENCES ${schemaProduct}.variant(id) ON DELETE CASCADE,
      supplier_id BIGINT REFERENCES ${schemaPartner}.supplier(id) ON DELETE CASCADE,
      price NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (variant_id, supplier_id)
    );

    CREATE TABLE IF NOT EXISTS ${schemaProduct}.product_stocks (
      id BIGSERIAL PRIMARY KEY,
      variant_id BIGINT REFERENCES ${schemaProduct}.variant(id) ON DELETE CASCADE,
      stock_qty INT DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_order_list_status_v2 ON ${schemaOrders}.order_list (status);
    CREATE INDEX IF NOT EXISTS idx_order_list_id_order_v2 ON ${schemaOrders}.order_list (id_order);
    CREATE INDEX IF NOT EXISTS idx_order_list_expired_at_v2 ON ${schemaOrders}.order_list (expired_at);
    CREATE INDEX IF NOT EXISTS idx_order_list_supply_id_v2 ON ${schemaOrders}.order_list (supply_id);
    CREATE INDEX IF NOT EXISTS idx_order_list_created_at_v2 ON ${schemaOrders}.order_list (created_at);
    CREATE INDEX IF NOT EXISTS idx_supplier_cost_log_order ON ${schemaPartner}.supplier_order_cost_log(order_list_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_cost_log_supply ON ${schemaPartner}.supplier_order_cost_log(supply_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_cost_log_status ON ${schemaPartner}.supplier_order_cost_log(ncc_payment_status);
    CREATE INDEX IF NOT EXISTS idx_variant_product ON ${schemaProduct}.variant(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_stocks_variant ON ${schemaProduct}.product_stocks(variant_id);
  `);

  // ==========================================
  // 3. BILLING SCHEMA (RECEIPTS & REFUND CREDITS)
  // ==========================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaReceipt}.payment_receipt (
      id BIGSERIAL PRIMARY KEY,
      id_order VARCHAR(100),
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      unallocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'UNALLOCATED',
      sender VARCHAR(255),
      receiver VARCHAR(255),
      gateway VARCHAR(100),
      reference_code VARCHAR(255),
      sepay_transaction_id VARCHAR(100) UNIQUE,
      transfer_type VARCHAR(20),
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaReceipt}.payment_receipt_allocations (
      id BIGSERIAL PRIMARY KEY,
      receipt_id BIGINT NOT NULL REFERENCES ${schemaReceipt}.payment_receipt(id) ON DELETE CASCADE,
      allocation_type VARCHAR(50) NOT NULL,
      target_code VARCHAR(100),
      amount NUMERIC(15, 2) NOT NULL,
      remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      note TEXT,
      created_by VARCHAR(100) DEFAULT 'AUTO_WEBHOOK',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaReceipt}.refund_credit_notes (
      id BIGSERIAL PRIMARY KEY,
      credit_code VARCHAR(100) UNIQUE,
      source_order_list_id BIGINT,
      source_order_code VARCHAR(100),
      customer_name VARCHAR(255),
      customer_contact VARCHAR(255),
      refund_amount NUMERIC(15, 2) DEFAULT 0,
      available_amount NUMERIC(15, 2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'OPEN',
      note TEXT,
      source_kind VARCHAR(50),
      issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaReceipt}.refund_credit_applications (
      id BIGSERIAL PRIMARY KEY,
      credit_note_id BIGINT REFERENCES ${schemaReceipt}.refund_credit_notes(id) ON DELETE CASCADE,
      target_order_list_id BIGINT,
      target_order_code VARCHAR(100),
      applied_amount NUMERIC(15, 2) DEFAULT 0,
      note TEXT,
      applied_by VARCHAR(100),
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_payment_receipt_id_order ON ${schemaReceipt}.payment_receipt(id_order);
    CREATE INDEX IF NOT EXISTS idx_payment_receipt_payment_date ON ${schemaReceipt}.payment_receipt(payment_date DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_receipt_status ON ${schemaReceipt}.payment_receipt(status);
    CREATE INDEX IF NOT EXISTS idx_payment_receipt_reference_code ON ${schemaReceipt}.payment_receipt(reference_code);
    CREATE INDEX IF NOT EXISTS idx_receipt_allocations_receipt_id ON ${schemaReceipt}.payment_receipt_allocations(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_allocations_target_code ON ${schemaReceipt}.payment_receipt_allocations(target_code);
    CREATE INDEX IF NOT EXISTS idx_refund_credit_notes_status ON ${schemaReceipt}.refund_credit_notes(status);
    CREATE INDEX IF NOT EXISTS idx_refund_credit_notes_source_order ON ${schemaReceipt}.refund_credit_notes(source_order_list_id);
    CREATE INDEX IF NOT EXISTS idx_refund_credit_applications_credit_note ON ${schemaReceipt}.refund_credit_applications(credit_note_id);
    CREATE INDEX IF NOT EXISTS idx_refund_credit_applications_target_order ON ${schemaReceipt}.refund_credit_applications(target_order_list_id);
  `);

  // ==========================================
  // 4. SYSTEM AUTOMATION SCHEMA (CONFIGS & LOGS)
  // ==========================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaSystem}.system_configs (
      id BIGSERIAL PRIMARY KEY,
      config_key VARCHAR(100) UNIQUE NOT NULL,
      config_value TEXT NOT NULL,
      data_type VARCHAR(20) NOT NULL DEFAULT 'STRING',
      description TEXT,
      group_name VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_by VARCHAR(100) DEFAULT 'SYSTEM'
    );

    CREATE INDEX IF NOT EXISTS idx_system_configs_key ON ${schemaSystem}.system_configs(config_key);
    CREATE INDEX IF NOT EXISTS idx_system_configs_group ON ${schemaSystem}.system_configs(group_name);
  `);

  await knex.raw(`
    INSERT INTO ${schemaSystem}.system_configs (config_key, config_value, data_type, description, group_name)
    VALUES
      ('RENEWAL_WARN_DAYS', '4', 'NUMBER', 'Số ngày trước khi hết hạn để gửi thông báo nhắc gia hạn', 'ORDER_BUSINESS'),
      ('RENEWAL_NOTIFICATION_TIME', '07:00', 'STRING', 'Thời gian trong ngày tự động gửi thông báo nhắc gia hạn đơn hàng', 'ORDER_BUSINESS'),
      ('USDT_EXCHANGE_RATE', '25400', 'NUMBER', 'Tỷ giá quy đổi mặc định từ 1 USDT sang VND', 'FINANCE'),
      ('SEPAY_AUTO_MATCH', 'true', 'BOOLEAN', 'Bật/tắt tính năng tự động khớp biên lai chuyển khoản ngân hàng', 'PAYMENT'),
      ('TELEGRAM_ENABLED', 'true', 'BOOLEAN', 'Bật/tắt toàn bộ dịch vụ thông báo Telegram', 'NOTIFY'),
      ('TELEGRAM_BOT_TOKEN', '', 'STRING', 'Telegram Bot API Token (HTTP API)', 'NOTIFY'),
      ('TELEGRAM_CHAT_ID', '', 'STRING', 'Telegram Group / Chat ID', 'NOTIFY'),
      ('SEND_ORDER_NOTIFICATION', 'true', 'BOOLEAN', 'Bật/tắt thông báo đơn hàng mới', 'NOTIFY'),
      ('SEND_FINANCE_DELTA_NOTIFICATION', 'true', 'BOOLEAN', 'Bật/tắt thông báo biến động tài chính', 'NOTIFY'),
      ('SEND_ERROR_NOTIFICATION', 'true', 'BOOLEAN', 'Bật/tắt thông báo lỗi hệ thống', 'NOTIFY'),
      ('SEND_ORDER_TO_TOPIC', 'true', 'BOOLEAN', 'Bật/tắt gửi đơn hàng vào Topic riêng biệt', 'NOTIFY'),
      ('SEND_ORDER_COPY_BUTTONS', 'true', 'BOOLEAN', 'Bật/tắt nút bấm copy thông tin đơn hàng trên Telegram', 'NOTIFY'),
      ('TELEGRAM_ORDER_TOPIC_ID', '', 'STRING', 'ID của Topic nhận thông báo Đơn Hàng Mới', 'NOTIFY'),
      ('TELEGRAM_RENEWAL_TOPIC_ID', '', 'STRING', 'ID của Topic nhận thông báo Cần Gia Hạn / Hết Hạn', 'NOTIFY'),
      ('TELEGRAM_FINANCE_TOPIC_ID', '', 'STRING', 'ID của Topic nhận thông báo Biến Động Tài Chính (Sepay, Chuyển tiền)', 'NOTIFY'),
      ('TELEGRAM_SYSTEM_ALERT_TOPIC_ID', '', 'STRING', 'ID của Topic nhận cảnh báo Lỗi Hệ Thống khẩn cấp', 'NOTIFY')
    ON CONFLICT (config_key) DO NOTHING;
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaSystem}.domain_event_store (
      id BIGSERIAL PRIMARY KEY,
      event_name VARCHAR(100) NOT NULL,
      aggregate_type VARCHAR(100) NOT NULL,
      aggregate_id VARCHAR(100),
      payload JSONB,
      status VARCHAR(30) DEFAULT 'PENDING',
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_domain_event_store_status ON ${schemaSystem}.domain_event_store(status);
    CREATE INDEX IF NOT EXISTS idx_domain_event_store_created_at ON ${schemaSystem}.domain_event_store(created_at);
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaSystem}.notification_logs (
      id BIGSERIAL PRIMARY KEY,
      channel VARCHAR(50) NOT NULL DEFAULT 'TELEGRAM',
      topic_type VARCHAR(50) NOT NULL,
      payload JSONB,
      status VARCHAR(30) NOT NULL DEFAULT 'SENT',
      error_message TEXT,
      sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notification_logs_topic ON ${schemaSystem}.notification_logs(topic_type);
  `);

  // ==========================================
  // 5. WAREHOUSE SCHEMA
  // ==========================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaWarehouse}.product_names (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      is_package BOOLEAN DEFAULT false,
      login_url TEXT,
      requires_storage BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaWarehouse}.accounts (
      id BIGSERIAL PRIMARY KEY,
      product_name_id BIGINT REFERENCES ${schemaWarehouse}.product_names(id) ON DELETE CASCADE,
      account_username VARCHAR(255) NOT NULL,
      account_identifier VARCHAR(255),
      password VARCHAR(255),
      key_hint VARCHAR(255),
      status VARCHAR(50) DEFAULT 'AVAILABLE',
      id_order VARCHAR(100),
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaWarehouse}.account_slots (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES ${schemaWarehouse}.accounts(id) ON DELETE CASCADE,
      name_id BIGINT REFERENCES ${schemaWarehouse}.product_names(id) ON DELETE CASCADE,
      slot_index INT NOT NULL DEFAULT 1,
      password TEXT,
      key_hint TEXT,
      backup_email VARCHAR(255),
      two_fa TEXT,
      status VARCHAR(50) DEFAULT 'AVAILABLE',
      customer VARCHAR(255),
      contact VARCHAR(255),
      id_order VARCHAR(100),
      days INT DEFAULT 30,
      expired_at TIMESTAMPTZ,
      service_note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_warehouse_accounts_product_name ON ${schemaWarehouse}.accounts(product_name_id);
    CREATE INDEX IF NOT EXISTS idx_warehouse_accounts_status ON ${schemaWarehouse}.accounts(status);
    CREATE INDEX IF NOT EXISTS idx_warehouse_account_slots_account ON ${schemaWarehouse}.account_slots(account_id);
    CREATE INDEX IF NOT EXISTS idx_warehouse_account_slots_name ON ${schemaWarehouse}.account_slots(name_id);
    CREATE INDEX IF NOT EXISTS idx_warehouse_account_slots_status ON ${schemaWarehouse}.account_slots(status);
    CREATE INDEX IF NOT EXISTS idx_warehouse_account_slots_expired_at ON ${schemaWarehouse}.account_slots(expired_at);

    CREATE TABLE IF NOT EXISTS ${schemaWarehouse}.package_products (
      id BIGSERIAL PRIMARY KEY,
      product_name_id BIGINT REFERENCES ${schemaWarehouse}.product_names(id) ON DELETE CASCADE,
      package_name VARCHAR(255),
      account_id BIGINT REFERENCES ${schemaWarehouse}.accounts(id) ON DELETE SET NULL,
      storage_account_id BIGINT REFERENCES ${schemaWarehouse}.accounts(id) ON DELETE SET NULL,
      supplier VARCHAR(255) DEFAULT 'Mavryk',
      cost NUMERIC(15, 2) DEFAULT 0,
      slot INT DEFAULT 2,
      storage_total TEXT,
      match_rule VARCHAR(100),
      package_note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ==========================================
  // 6. FINANCE SCHEMA (ACCOUNTS, ASSETS, SAVINGS, DEBTS & DASHBOARD)
  // ==========================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaFinance}.financial_accounts (
      id BIGSERIAL PRIMARY KEY,
      account_type VARCHAR(20) NOT NULL DEFAULT 'bank',
      label TEXT,
      account_number TEXT NOT NULL,
      account_holder TEXT,
      bank_bin TEXT,
      bank_short_code TEXT,
      bank_display_name TEXT,
      qr_note_prefix TEXT,
      account_scope VARCHAR(50) DEFAULT 'SHOP',
      is_default BOOLEAN DEFAULT false,
      balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      total_withdrawn NUMERIC(15, 2) DEFAULT 0,
      total_received NUMERIC(15, 2) DEFAULT 0,
      is_deleted BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaFinance}.financial_account_ledger (
      id BIGSERIAL PRIMARY KEY,
      financial_account_id BIGINT NOT NULL REFERENCES ${schemaFinance}.financial_accounts(id) ON DELETE CASCADE,
      amount NUMERIC(15, 2) NOT NULL,
      balance_after NUMERIC(15, 2) NOT NULL,
      entry_type VARCHAR(20) NOT NULL,
      reference_type VARCHAR(50),
      reference_id VARCHAR(100),
      description TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_financial_accounts_active ON ${schemaFinance}.financial_accounts(is_active, is_deleted);
    CREATE INDEX IF NOT EXISTS idx_financial_accounts_type ON ${schemaFinance}.financial_accounts(account_type);
    CREATE INDEX IF NOT EXISTS idx_financial_account_ledger_account_created ON ${schemaFinance}.financial_account_ledger(financial_account_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ${schemaFinance}.fixed_costs (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      category VARCHAR(50) NOT NULL DEFAULT 'LIVING',
      is_active BOOLEAN NOT NULL DEFAULT true,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ${schemaFinance}.installments (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      monthly_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      total_periods INT NOT NULL DEFAULT 1 CHECK (total_periods > 0),
      start_period VARCHAR(7) NOT NULL,
      due_day INT NOT NULL DEFAULT 15,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      is_active BOOLEAN NOT NULL DEFAULT true,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS ${schemaFinance}.personal_bank_accounts (
      id BIGSERIAL PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      account_number VARCHAR(50) NOT NULL,
      account_holder VARCHAR(100),
      bank_display_name VARCHAR(100),
      bank_short_code VARCHAR(50),
      balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE OR REPLACE VIEW ${schemaFinance}.personal_assets AS
    SELECT id, name, 'SAVINGS' AS type, amount, note, profit_enabled, profit_frequency, annual_interest_rate, profit_destination, profit_account_id, profit_credit_time, false AS debt_interest_enabled, null::varchar AS debt_interest_frequency, null::numeric AS debt_annual_interest_rate, null::integer AS debt_due_day, null::date AS debt_end_date, null::varchar AS debt_repayment_frequency, created_at, updated_at FROM ${schemaFinance}.personal_savings
    UNION ALL
    SELECT id, name, 'GOLD_INVESTMENT' AS type, amount, note, false AS profit_enabled, null::varchar AS profit_frequency, null::numeric AS annual_interest_rate, null::varchar AS profit_destination, null::integer AS profit_account_id, null::varchar AS profit_credit_time, false AS debt_interest_enabled, null::varchar AS debt_interest_frequency, null::numeric AS debt_annual_interest_rate, null::integer AS debt_due_day, null::date AS debt_end_date, null::varchar AS debt_repayment_frequency, created_at, updated_at FROM ${schemaFinance}.personal_investments
    UNION ALL
    SELECT id, name, type, amount, note, false AS profit_enabled, null::varchar AS profit_frequency, null::numeric AS annual_interest_rate, null::varchar AS profit_destination, null::integer AS profit_account_id, null::varchar AS profit_credit_time, debt_interest_enabled, debt_interest_frequency, debt_annual_interest_rate, debt_due_day, debt_end_date, debt_repayment_frequency, created_at, updated_at FROM ${schemaFinance}.personal_debts;

    CREATE TABLE IF NOT EXISTS ${schemaFinance}.debt_payment_logs (
      id BIGSERIAL PRIMARY KEY,
      target_type VARCHAR(50) NOT NULL,
      target_id BIGINT NOT NULL,
      period_month VARCHAR(7),
      financial_account_id BIGINT REFERENCES ${schemaFinance}.financial_accounts(id) ON DELETE SET NULL,
      amount NUMERIC(15, 2) NOT NULL,
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (target_type, target_id, period_month)
    );

    CREATE INDEX IF NOT EXISTS idx_debt_payment_logs_target ON ${schemaFinance}.debt_payment_logs(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_debt_payment_logs_financial_account ON ${schemaFinance}.debt_payment_logs(financial_account_id);

    CREATE TABLE IF NOT EXISTS ${schemaDashboard}.daily_revenue_summary (
      id BIGSERIAL PRIMARY KEY,
      summary_date DATE UNIQUE NOT NULL,
      total_orders INT DEFAULT 0,
      total_revenue NUMERIC(15, 2) DEFAULT 0,
      total_cost NUMERIC(15, 2) DEFAULT 0,
      net_profit NUMERIC(15, 2) DEFAULT 0,
      earned_revenue NUMERIC(15, 2) DEFAULT 0,
      total_shop_cost NUMERIC(15, 2) DEFAULT 0,
      revenue_reversed NUMERIC(15, 2) DEFAULT 0,
      dashboard_orders_count INT DEFAULT 0,
      dashboard_canceled_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaAdmin}.users (
      userid BIGSERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      passwordhash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      createdat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin user if not exists
  const adminExists = await knex(`${schemaAdmin}.users`).where({ username: 'admin' }).first();
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hashedPass = await bcrypt.hash('admin123', 10);
    await knex(`${schemaAdmin}.users`).insert({
      username: 'admin',
      passwordhash: hashedPass,
      role: 'admin',
    });
  }

  // Seed default bank account if not exists
  const bankExists = await knex(`${schemaFinance}.financial_accounts`).where({ account_type: 'bank' }).first();
  if (!bankExists) {
    await knex(`${schemaFinance}.financial_accounts`).insert({
      account_type: 'bank',
      label: 'Vietcombank Chính',
      account_number: '1234567890',
      account_holder: 'MAVRYK STORE',
      bank_short_code: 'VCB',
      is_default: true,
      is_active: true,
      balance: 10000000
    });
  }
};

exports.down = async function (knex) {
  await knex.raw(`DROP TABLE IF EXISTS ${schemaDashboard}.daily_revenue_summary CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaAdmin}.users CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.debt_payment_logs CASCADE;`);
  await knex.raw(`DROP VIEW IF EXISTS ${schemaFinance}.personal_assets CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_bank_accounts CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_debts CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_investments CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.personal_savings CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.installments CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.fixed_costs CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.financial_account_ledger CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaFinance}.financial_accounts CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaWarehouse}.package_products CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaWarehouse}.account_slots CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaWarehouse}.accounts CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaWarehouse}.product_names CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaSystem}.notification_logs CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaSystem}.domain_event_store CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaSystem}.system_configs CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaReceipt}.refund_credit_applications CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaReceipt}.refund_credit_notes CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaReceipt}.payment_receipt_allocations CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaReceipt}.payment_receipt CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaProduct}.product_stocks CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaProduct}.supplier_cost CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaProduct}.variant_price CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaProduct}.variant CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaProduct}.product CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaPartner}.supplier_order_cost_log CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaPartner}.supplier CASCADE;`);
  await knex.raw(`DROP TABLE IF EXISTS ${schemaOrders}.order_list CASCADE;`);
};
