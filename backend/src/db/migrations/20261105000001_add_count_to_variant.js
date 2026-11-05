/**
 * Migration 20261105000001: Add count column to business.variant & backfill historical successful orders
 */
const schemaProduct = process.env.DB_SCHEMA_PRODUCT || process.env.SCHEMA_PRODUCT || "business";
const schemaOrders = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "business";

exports.up = async function (knex) {
  // 1. Thêm cột count vào bảng variant (mặc định 0, không null)
  await knex.raw(`
    ALTER TABLE IF EXISTS ${schemaProduct}.variant 
    ADD COLUMN IF NOT EXISTS count INT DEFAULT 0 NOT NULL;
  `);

  // 2. Khởi tạo giá trị count ban đầu từ các đơn hàng thành công trong lịch sử
  // Đơn thành công: was_paid = true hoặc status = 'PAID' (kể cả nay đã hết hạn EXPIRED / RENEW_REQUIRED)
  await knex.raw(`
    UPDATE ${schemaProduct}.variant v
    SET count = COALESCE(sub.total_orders, 0)
    FROM (
      SELECT id_product::bigint AS variant_id, COUNT(*) AS total_orders
      FROM ${schemaOrders}.order_list
      WHERE (status = 'PAID' OR was_paid = true OR status IN ('EXPIRED', 'RENEW_REQUIRED'))
        AND id_product ~ '^[0-9]+$'
      GROUP BY id_product::bigint
    ) sub
    WHERE v.id = sub.variant_id;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${schemaProduct}.variant 
    DROP COLUMN IF EXISTS count;
  `);
};

