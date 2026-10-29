/**
 * Migration: Tạo bảng lưu vết các đợt gộp đơn thanh toán (Batch Payment Requests) kèm Slot Suffix
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const schemaReceipt = process.env.DB_SCHEMA_RECEIPT || process.env.SCHEMA_RECEIPT || "billing";
  const schemaFinance = process.env.DB_SCHEMA_FINANCE || process.env.SCHEMA_FINANCE || "finance";

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${schemaReceipt}.batch_payment_requests (
      id BIGSERIAL PRIMARY KEY,
      batch_code VARCHAR(50) UNIQUE NOT NULL,
      order_codes JSONB NOT NULL DEFAULT '[]',
      order_ids JSONB NOT NULL DEFAULT '[]',
      base_amount NUMERIC(15, 2) NOT NULL,
      slot_suffix INT NOT NULL DEFAULT 0,
      total_amount NUMERIC(15, 2) NOT NULL,
      financial_account_id BIGINT REFERENCES ${schemaFinance}.financial_accounts(id) ON DELETE SET NULL,
      customer_name VARCHAR(255),
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELED')),
      payment_receipt_id BIGINT REFERENCES ${schemaReceipt}.payment_receipt(id) ON DELETE SET NULL,
      note TEXT,
      created_by VARCHAR(100) DEFAULT 'ADMIN',
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_batch_payment_code 
      ON ${schemaReceipt}.batch_payment_requests(batch_code);

    CREATE INDEX IF NOT EXISTS idx_batch_payment_status 
      ON ${schemaReceipt}.batch_payment_requests(status);

    CREATE INDEX IF NOT EXISTS idx_batch_payment_matching 
      ON ${schemaReceipt}.batch_payment_requests(total_amount, financial_account_id, status);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const schemaReceipt = process.env.DB_SCHEMA_RECEIPT || process.env.SCHEMA_RECEIPT || "billing";
  await knex.raw(`DROP TABLE IF EXISTS ${schemaReceipt}.batch_payment_requests CASCADE;`);
};

