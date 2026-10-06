/**
 * Migration 20261004000001: V2 Database Refactoring & Initialization
 * Consolidates all V2 schema changes into a single migration file:
 * 1. Order Status Standardization & Indexing
 * 2. Payment Receipt Allocations & Restructuring
 * 3. System Configs Table & Default Configurations Seed
 * 4. Notification Logs Table & Telegram Configs Seed
 */

const schemaOrders = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "business";
const schemaReceipt = process.env.DB_SCHEMA_RECEIPT || process.env.SCHEMA_RECEIPT || "billing";
const schemaSystem = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // ==========================================
  // 1. REFACTOR ORDER STATUSES & INDEX
  // ==========================================
  await knex.raw(`
    UPDATE ${schemaOrders}.order_list
    SET status = CASE
      WHEN status ILIKE '%Đã Thanh Toán%' OR status ILIKE '%Hoàn thành%' THEN 'PAID'
      WHEN status ILIKE '%Chưa Thanh Toán%' OR status ILIKE '%Chờ xử lý%' OR status ILIKE '%Đang xử lý%' THEN 'UNPAID'
      WHEN status ILIKE '%Cần Gia Hạn%' OR status ILIKE '%Cần gia hạn%' THEN 'RENEW_REQUIRED'
      WHEN status ILIKE '%Hết Hạn%' THEN 'EXPIRED'
      WHEN status ILIKE '%Chưa Hoàn%' OR status ILIKE '%Chờ Hoàn%' THEN 'REFUND_PENDING'
      WHEN status ILIKE '%Đã Hoàn%' THEN 'REFUNDED'
      WHEN status ILIKE '%Hủy%' OR status ILIKE '%Đã Hủy%' THEN 'CANCELED'
      ELSE 'UNPAID'
    END
    WHERE status NOT IN ('PAID', 'UNPAID', 'RENEW_REQUIRED', 'EXPIRED', 'REFUND_PENDING', 'REFUNDED', 'CANCELED');
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_order_list_status_v2 ON ${schemaOrders}.order_list (status);
  `);

  // ==========================================
  // 2. PAYMENT RECEIPT ALLOCATIONS & RESTRUCTURING
  // ==========================================
  await knex.raw(`
    ALTER TABLE ${schemaReceipt}.payment_receipt 
      ADD COLUMN IF NOT EXISTS unallocated_amount NUMERIC(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'UNALLOCATED';
  `);

  await knex.raw(`
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

    CREATE INDEX IF NOT EXISTS idx_receipt_allocations_receipt_id ON ${schemaReceipt}.payment_receipt_allocations(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_allocations_target_code ON ${schemaReceipt}.payment_receipt_allocations(target_code);
  `);

  // Backfill allocations from payment_receipt
  await knex.raw(`
    INSERT INTO ${schemaReceipt}.payment_receipt_allocations (receipt_id, allocation_type, target_code, amount, remaining_balance, note, created_by)
    SELECT id, 'ORDER', id_order, amount, 0, 'Auto-migrated from V1 order receipt', 'SYSTEM_MIGRATION'
    FROM ${schemaReceipt}.payment_receipt
    WHERE id_order IS NOT NULL AND id_order != '';
  `);

  await knex.raw(`
    INSERT INTO ${schemaReceipt}.payment_receipt_allocations (receipt_id, allocation_type, target_code, amount, remaining_balance, note, created_by)
    SELECT id, 'OUTGOING', NULL, amount, 0, 'Auto-migrated from V1 outgoing receipt', 'SYSTEM_MIGRATION'
    FROM ${schemaReceipt}.payment_receipt
    WHERE (id_order IS NULL OR id_order = '') AND transfer_type = 'out';
  `);

  await knex.raw(`
    UPDATE ${schemaReceipt}.payment_receipt
    SET unallocated_amount = 0,
        status = 'FULLY_ALLOCATED'
    WHERE (id_order IS NOT NULL AND id_order != '') OR transfer_type = 'out';
  `);

  await knex.raw(`
    UPDATE ${schemaReceipt}.payment_receipt
    SET unallocated_amount = amount,
        status = 'UNALLOCATED'
    WHERE (id_order IS NULL OR id_order = '') AND (transfer_type IS NULL OR transfer_type != 'out');
  `);

  // ==========================================
  // 3. SYSTEM CONFIGS TABLE & SEED
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
      ('USDT_EXCHANGE_RATE', '25400', 'NUMBER', 'Tỷ giá quy đổi mặc định từ 1 USDT sang VND', 'FINANCE'),
      ('SEPAY_AUTO_MATCH', 'true', 'BOOLEAN', 'Bật/tắt tính năng tự động khớp biên lai chuyển khoản ngân hàng', 'PAYMENT'),
      ('TELEGRAM_ENABLED', 'true', 'BOOLEAN', 'Bật/tắt toàn bộ dịch vụ thông báo Telegram', 'NOTIFY'),
      ('TELEGRAM_ORDER_TOPIC_ID', '', 'STRING', 'ID của Topic nhận thông báo Đơn Hàng Mới', 'NOTIFY'),
      ('TELEGRAM_RENEWAL_TOPIC_ID', '', 'STRING', 'ID của Topic nhận thông báo Cần Gia Hạn / Hết Hạn', 'NOTIFY'),
      ('TELEGRAM_FINANCE_TOPIC_ID', '', 'STRING', 'ID của Topic nhận thông báo Biến Động Tài Chính (Sepay, Chuyển tiền)', 'NOTIFY'),
      ('TELEGRAM_SYSTEM_ALERT_TOPIC_ID', '', 'STRING', 'ID của Topic nhận cảnh báo Lỗi Hệ Thống khẩn cấp', 'NOTIFY')
    ON CONFLICT (config_key) DO NOTHING;
  `);

  // ==========================================
  // 4. NOTIFICATION LOGS TABLE
  // ==========================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaSystem}.notification_logs (
      id BIGSERIAL PRIMARY KEY,
      channel VARCHAR(30) NOT NULL DEFAULT 'TELEGRAM',
      event_type VARCHAR(100) NOT NULL,
      recipient VARCHAR(100),
      message_content TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      error_message TEXT,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON ${schemaSystem}.notification_logs(channel);
    CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON ${schemaSystem}.notification_logs(status);
    CREATE INDEX IF NOT EXISTS idx_notification_logs_event ON ${schemaSystem}.notification_logs(event_type);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // 4. Drop notification_logs
  await knex.raw(`
    DROP TABLE IF EXISTS ${schemaSystem}.notification_logs;
  `);

  // 3. Drop system_configs
  await knex.raw(`
    DROP TABLE IF EXISTS ${schemaSystem}.system_configs;
  `);

  // 2. Rollback payment_receipt_allocations & columns
  await knex.raw(`
    ALTER TABLE ${schemaReceipt}.payment_receipt ADD COLUMN IF NOT EXISTS id_order VARCHAR(100);
  `);

  const hasAllocationsTable = await knex.schema.withSchema(schemaReceipt).hasTable('payment_receipt_allocations');
  if (hasAllocationsTable) {
    await knex.raw(`
      UPDATE ${schemaReceipt}.payment_receipt r
      SET id_order = a.target_code
      FROM ${schemaReceipt}.payment_receipt_allocations a
      WHERE r.id = a.receipt_id AND a.allocation_type = 'ORDER';
    `);
  }

  await knex.raw(`
    DROP TABLE IF EXISTS ${schemaReceipt}.payment_receipt_allocations;
    ALTER TABLE ${schemaReceipt}.payment_receipt 
      DROP COLUMN IF EXISTS unallocated_amount,
      DROP COLUMN IF EXISTS status;
  `);

  // 1. Rollback order_list status & index
  await knex.raw(`
    UPDATE ${schemaOrders}.order_list
    SET status = CASE
      WHEN status = 'PAID' THEN 'Đã Thanh Toán'
      WHEN status = 'UNPAID' THEN 'Chưa Thanh Toán'
      WHEN status = 'RENEW_REQUIRED' THEN 'Cần Gia Hạn'
      WHEN status = 'EXPIRED' THEN 'Hết Hạn'
      WHEN status = 'REFUND_PENDING' THEN 'Chưa Hoàn'
      WHEN status = 'REFUNDED' THEN 'Đã Hoàn'
      WHEN status = 'CANCELED' THEN 'Đã Hủy'
      ELSE status
    END;
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS ${schemaOrders}.idx_order_list_status_v2;
  `);
};
