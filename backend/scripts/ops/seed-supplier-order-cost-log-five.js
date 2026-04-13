/**
 * Backfill partner.supplier_order_cost_log: tối đa 5 đơn đang «Đang Xử Lý» chưa có log.
 * - 2 đơn ưu tiên mã MAVN (nhập hàng), mới nhất trước
 * - 3 đơn còn lại (không MAVN), mới nhất trước
 *
 * Chạy: từ thư mục backend: node scripts/ops/seed-supplier-order-cost-log-five.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { db } = require("../../src/db");
const { ORDER_PREFIXES } = require("../../src/utils/orderHelpers");
const { STATUS } = require("../../src/utils/statuses");

const PROCESSING = STATUS.PROCESSING;
const mavnLike = `${String(ORDER_PREFIXES.import || "MAVN").toUpperCase().replace(/'/g, "''")}%`;

async function main() {
  const sql = `
    INSERT INTO partner.supplier_order_cost_log (
      order_list_id,
      supply_id,
      id_order,
      import_cost,
      refund_amount,
      ncc_payment_status
    )
    SELECT
      q.order_list_id,
      q.supply_id,
      q.id_order,
      q.import_cost,
      q.refund_amount,
      q.ncc_payment_status
    FROM (
      SELECT * FROM (
        SELECT
          o.id AS order_list_id,
          o.supply_id,
          COALESCE(NULLIF(TRIM(o.id_order::text), ''), '') AS id_order,
          COALESCE(o.cost, 0) AS import_cost,
          COALESCE(o.refund, 0) AS refund_amount,
          'Chưa Thanh Toán' AS ncc_payment_status
        FROM orders.order_list o
        WHERE o.status = '${PROCESSING.replace(/'/g, "''")}'
          AND o.supply_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM partner.supplier_order_cost_log l
            WHERE l.order_list_id = o.id
          )
          AND UPPER(TRIM(COALESCE(o.id_order::text, ''))) LIKE '${mavnLike}'
        ORDER BY o.id DESC
        LIMIT 2
      ) mavn
      UNION ALL
      SELECT * FROM (
        SELECT
          o.id AS order_list_id,
          o.supply_id,
          COALESCE(NULLIF(TRIM(o.id_order::text), ''), '') AS id_order,
          COALESCE(o.cost, 0) AS import_cost,
          COALESCE(o.refund, 0) AS refund_amount,
          'Chưa Thanh Toán' AS ncc_payment_status
        FROM orders.order_list o
        WHERE o.status = '${PROCESSING.replace(/'/g, "''")}'
          AND o.supply_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM partner.supplier_order_cost_log l
            WHERE l.order_list_id = o.id
          )
          AND UPPER(TRIM(COALESCE(o.id_order::text, ''))) NOT LIKE '${mavnLike}'
        ORDER BY o.id DESC
        LIMIT 3
      ) other
    ) q
    RETURNING order_list_id, id_order, supply_id, import_cost;
  `;

  const result = await db.raw(sql);
  const rows = result.rows || [];
  const inserted = Array.isArray(rows) ? rows : [];

  console.log(`Đã chèn: ${inserted.length} dòng.`);
  inserted.forEach((r) => {
    console.log(
      `  - order_list_id=${r.order_list_id} id_order=${r.id_order} supply_id=${r.supply_id} cost=${r.import_cost}`
    );
  });

  if (inserted.length === 0) {
    console.log(
      "Không có đơn «Đang Xử Lý» + có NCC nào chưa có log (hoặc đủ 5 loại không khớp). Kiểm tra dữ liệu orders.order_list."
    );
  }

  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
