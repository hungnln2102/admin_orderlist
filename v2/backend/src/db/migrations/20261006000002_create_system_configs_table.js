/**
 * Migration 20261006000002: Create system_configs table for dynamic business configurations (V2)
 */

const schemaSystem = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
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

  // Seed các giá trị mặc định cho cấu hình hệ thống
  await knex.raw(`
    INSERT INTO ${schemaSystem}.system_configs (config_key, config_value, data_type, description, group_name)
    VALUES
      ('RENEWAL_WARN_DAYS', '4', 'NUMBER', 'Số ngày trước khi hết hạn để gửi thông báo nhắc gia hạn', 'ORDER_BUSINESS'),
      ('USDT_EXCHANGE_RATE', '25400', 'NUMBER', 'Tỷ giá quy đổi mặc định từ 1 USDT sang VND', 'FINANCE'),
      ('SEPAY_AUTO_MATCH', 'true', 'BOOLEAN', 'Bật/tắt tính năng tự động khớp biên lai chuyển khoản ngân hàng', 'PAYMENT')
    ON CONFLICT (config_key) DO NOTHING;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS ${schemaSystem}.system_configs;
  `);
};
