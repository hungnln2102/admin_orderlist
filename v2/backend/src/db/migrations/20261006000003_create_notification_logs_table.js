/**
 * Migration 20261006000003: Create notification_logs table and seed Telegram system configs (V2)
 */

const schemaSystem = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tạo bảng notification_logs
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

  // 2. Seed các biến cấu hình Telegram vào system_configs
  await knex.raw(`
    INSERT INTO ${schemaSystem}.system_configs (config_key, config_value, data_type, description, group_name)
    VALUES
      ('TELEGRAM_ENABLED', 'true', 'BOOLEAN', 'Bật/tắt toàn bộ dịch vụ thông báo Telegram', 'NOTIFY'),
      ('TELEGRAM_ORDER_TOPIC_ID', '', 'STRING', 'ID của Topic nhận thông báo Đơn Hàng Mới', 'NOTIFY'),
      ('TELEGRAM_RENEWAL_TOPIC_ID', '', 'STRING', 'ID của Topic nhận thông báo Cần Gia Hạn / Hết Hạn', 'NOTIFY'),
      ('TELEGRAM_FINANCE_TOPIC_ID', '', 'STRING', 'ID của Topic nhận thông báo Biến Động Tài Chính (Sepay, Chuyển tiền)', 'NOTIFY'),
      ('TELEGRAM_SYSTEM_ALERT_TOPIC_ID', '', 'STRING', 'ID của Topic nhận cảnh báo Lỗi Hệ Thống khẩn cấp', 'NOTIFY')
    ON CONFLICT (config_key) DO NOTHING;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS ${schemaSystem}.notification_logs;
  `);
};
