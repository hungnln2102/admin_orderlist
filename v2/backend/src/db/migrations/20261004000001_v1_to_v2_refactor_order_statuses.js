/**
 * Migration 20261004000001: Refactor Order Statuses & Restructure Payment Receipts (V1 to V2)
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Cập nhật các bản ghi legacy về đúng mã ORDER_STATUS chuẩn
  await knex.raw(`
    UPDATE orders.order_list
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

  // 2. Tạo Index B-Tree cho cột status của order_list
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_order_list_status_v2 ON orders.order_list (status);
  `);

  // 3. Tái cấu trúc bảng receipt.payment_receipt: Thêm unallocated_amount & status
  await knex.raw(`
    ALTER TABLE receipt.payment_receipt 
      ADD COLUMN IF NOT EXISTS unallocated_amount NUMERIC(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'UNALLOCATED';
  `);

  // 4. Tạo bảng phân bổ / đối soát biên lai: receipt.payment_receipt_allocations
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS receipt.payment_receipt_allocations (
      id BIGSERIAL PRIMARY KEY,
      receipt_id BIGINT NOT NULL REFERENCES receipt.payment_receipt(id) ON DELETE CASCADE,
      allocation_type VARCHAR(50) NOT NULL,
      target_code VARCHAR(100),
      amount NUMERIC(15, 2) NOT NULL,
      remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
      note TEXT,
      created_by VARCHAR(100) DEFAULT 'AUTO_WEBHOOK',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_receipt_allocations_receipt_id ON receipt.payment_receipt_allocations(receipt_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_allocations_target_code ON receipt.payment_receipt_allocations(target_code);
  `);

  // 5. Backfill dữ liệu phân bổ đợt 1 từ bảng payment_receipt hiện tại sang payment_receipt_allocations
  
  // 5a. Phân bổ cho các Biên lai Đơn hàng (có id_order)
  await knex.raw(`
    INSERT INTO receipt.payment_receipt_allocations (receipt_id, allocation_type, target_code, amount, remaining_balance, note, created_by)
    SELECT id, 'ORDER', id_order, amount, 0, 'Auto-migrated from V1 order receipt', 'SYSTEM_MIGRATION'
    FROM receipt.payment_receipt
    WHERE id_order IS NOT NULL AND id_order != '';
  `);

  // 5b. Phân bổ cho các Biên lai Chi phí (transfer_type = 'out' và không có id_order)
  await knex.raw(`
    INSERT INTO receipt.payment_receipt_allocations (receipt_id, allocation_type, target_code, amount, remaining_balance, note, created_by)
    SELECT id, 'OUTGOING', NULL, amount, 0, 'Auto-migrated from V1 outgoing receipt', 'SYSTEM_MIGRATION'
    FROM receipt.payment_receipt
    WHERE (id_order IS NULL OR id_order = '') AND transfer_type = 'out';
  `);

  // 5c. Cập nhật unallocated_amount và status cho bảng receipt.payment_receipt
  // Đã phân bổ 100% (Cho các biên lai có id_order hoặc transfer_type = 'out')
  await knex.raw(`
    UPDATE receipt.payment_receipt
    SET unallocated_amount = 0,
        status = 'FULLY_ALLOCATED'
    WHERE (id_order IS NOT NULL AND id_order != '') OR transfer_type = 'out';
  `);

  // Chưa phân bổ (Cho các biên lai còn lại)
  await knex.raw(`
    UPDATE receipt.payment_receipt
    SET unallocated_amount = amount,
        status = 'UNALLOCATED'
    WHERE (id_order IS NULL OR id_order = '') AND (transfer_type IS NULL OR transfer_type != 'out');
  `);

  // 6. Xóa cột legacy id_order khỏi receipt.payment_receipt
  await knex.raw(`
    ALTER TABLE receipt.payment_receipt DROP COLUMN IF EXISTS id_order;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Thêm lại cột id_order
  await knex.raw(`
    ALTER TABLE receipt.payment_receipt ADD COLUMN IF NOT EXISTS id_order VARCHAR(100);
  `);

  // Khôi phục cột id_order từ bảng allocations nếu bảng tồn tại
  const hasAllocationsTable = await knex.schema.withSchema('receipt').hasTable('payment_receipt_allocations');
  if (hasAllocationsTable) {
    await knex.raw(`
      UPDATE receipt.payment_receipt r
      SET id_order = a.target_code
      FROM receipt.payment_receipt_allocations a
      WHERE r.id = a.receipt_id AND a.allocation_type = 'ORDER';
    `);
  }

  // Xóa bảng allocations & các cột mới
  await knex.raw(`
    DROP TABLE IF EXISTS receipt.payment_receipt_allocations;
    ALTER TABLE receipt.payment_receipt 
      DROP COLUMN IF EXISTS unallocated_amount,
      DROP COLUMN IF EXISTS status;
  `);

  // Rollback order_list status
  await knex.raw(`
    UPDATE orders.order_list
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
    DROP INDEX IF EXISTS orders.idx_order_list_status_v2;
  `);
};

