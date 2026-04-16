-- Fix dữ liệu đang bị import_cost = 0 nhưng refund_amount = 0
-- (đa phần phát sinh từ dòng log archive trước khi sửa rule).

UPDATE partner.supplier_order_cost_log l
SET import_cost = COALESCE(o.cost, 0)
FROM orders.order_list o
WHERE o.id = l.order_list_id
  AND COALESCE(l.import_cost, 0) = 0
  AND COALESCE(l.refund_amount, 0) = 0
  AND COALESCE(o.cost, 0) > 0;

