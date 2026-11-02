/**
 * Migration: Chuyển đổi dữ liệu cũ và Xóa cột refund_amount khỏi partner.supplier_order_cost_log
 * Theo chỉ đạo của Master: Toàn bộ công nợ NCC quy về duy nhất cột import_cost (hỗ trợ số âm).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const schemaPartner = process.env.DB_SCHEMA_PARTNER || "partner";

  // 1. Bảo toàn 100% dữ liệu lịch sử V1: chuyển các log có refund_amount > 0 thành import_cost âm
  await knex.raw(`
    UPDATE ${schemaPartner}.supplier_order_cost_log
    SET import_cost = -refund_amount
    WHERE refund_amount > 0;
  `);

  // 2. Xóa bỏ cột tàn tích refund_amount
  await knex.raw(`
    ALTER TABLE ${schemaPartner}.supplier_order_cost_log
    DROP COLUMN IF EXISTS refund_amount;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const schemaPartner = process.env.DB_SCHEMA_PARTNER || "partner";

  await knex.raw(`
    ALTER TABLE ${schemaPartner}.supplier_order_cost_log
    ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(15, 2) DEFAULT 0;
  `);

  await knex.raw(`
    UPDATE ${schemaPartner}.supplier_order_cost_log
    SET refund_amount = -import_cost, import_cost = 0
    WHERE import_cost < 0;
  `);
};

