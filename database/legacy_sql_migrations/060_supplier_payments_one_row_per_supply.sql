-- Gộp nhiều dòng partner.supplier_payments / supplier → 1 dòng (tổng amount_paid), ràng buộc 1 NCC = 1 chu kỳ.
WITH agg AS (
  SELECT
    supplier_id,
    SUM(COALESCE(amount_paid, 0))::numeric AS total_paid,
    MIN(id) AS keep_id
  FROM partner.supplier_payments
  GROUP BY supplier_id
)
UPDATE partner.supplier_payments p
SET amount_paid = agg.total_paid
FROM agg
WHERE p.id = agg.keep_id;

DELETE FROM partner.supplier_payments p
WHERE p.id NOT IN (
  SELECT MIN(id) FROM partner.supplier_payments GROUP BY supplier_id
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_payments_supplier_id
  ON partner.supplier_payments (supplier_id);
