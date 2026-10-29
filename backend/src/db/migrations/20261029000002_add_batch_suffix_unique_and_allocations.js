/**
 * Migration: Bổ sung order_allocations và Partial Unique Index cho Slot Suffix đang PENDING
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const schemaReceipt = process.env.DB_SCHEMA_RECEIPT || process.env.SCHEMA_RECEIPT || "billing";

  await knex.raw(`
    ALTER TABLE ${schemaReceipt}.batch_payment_requests 
      ADD COLUMN IF NOT EXISTS order_allocations JSONB NOT NULL DEFAULT '[]';

    CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_pending_slot_suffix 
      ON ${schemaReceipt}.batch_payment_requests (slot_suffix) 
      WHERE status = 'PENDING';
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const schemaReceipt = process.env.DB_SCHEMA_RECEIPT || process.env.SCHEMA_RECEIPT || "billing";

  await knex.raw(`
    DROP INDEX IF EXISTS ${schemaReceipt}.idx_batch_pending_slot_suffix;

    ALTER TABLE ${schemaReceipt}.batch_payment_requests 
      DROP COLUMN IF EXISTS order_allocations;
  `);
};

