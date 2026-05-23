-- Slot suffix matching: thay nội dung CK bằng `price` mang suffix định danh.
-- Sequence cấp suffix luân phiên 1..100; bảng order_payment_slots lưu lifecycle
-- từng chu kỳ thanh toán (đơn mới + mỗi lần gia hạn = 1 slot).

CREATE SEQUENCE IF NOT EXISTS orders.payment_amount_suffix_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 100
  CYCLE;

COMMENT ON SEQUENCE orders.payment_amount_suffix_seq IS
  'Suffix định danh cộng vào giá đơn (1..100, CYCLE). Mỗi đơn pending có 1 suffix duy nhất trên (receiver, base_amount).';

CREATE TABLE IF NOT EXISTS orders.order_payment_slots (
  id bigserial PRIMARY KEY,
  id_order text NOT NULL,
  receiver_account text NOT NULL,
  cycle_index integer NOT NULL,
  slot_kind text NOT NULL,
  base_amount numeric(18, 2) NOT NULL,
  amount_suffix integer NOT NULL,
  expected_amount numeric(18, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  matched_at timestamptz,
  payment_receipt_id bigint,
  cancelled_at timestamptz,
  cancelled_reason text,
  CONSTRAINT order_payment_slots_status_check
    CHECK (status IN ('pending', 'matched', 'cancelled', 'expired')),
  CONSTRAINT order_payment_slots_slot_kind_check
    CHECK (slot_kind IN ('new', 'renewal'))
);

COMMENT ON TABLE orders.order_payment_slots IS
  'Mỗi chu kỳ chờ thanh toán = 1 slot (đơn mới hoặc gia hạn). Webhook match theo (receiver_account, expected_amount).';
COMMENT ON COLUMN orders.order_payment_slots.cycle_index IS
  'Chỉ số chu kỳ trong vòng đời đơn (1 = mua mới, 2+ = các lần gia hạn).';
COMMENT ON COLUMN orders.order_payment_slots.slot_kind IS '"new" hoặc "renewal".';
COMMENT ON COLUMN orders.order_payment_slots.base_amount IS
  'Giá gốc (trước khi cộng suffix) — chốt từ bảng giá / pricing tại thời điểm mở slot.';
COMMENT ON COLUMN orders.order_payment_slots.amount_suffix IS
  'Số nguyên 1..100 cộng vào base_amount để ra expected_amount.';
COMMENT ON COLUMN orders.order_payment_slots.expected_amount IS
  'Số tiền khách cần CK (= base_amount + amount_suffix). Cũng được mirror vào orders.order_list.price.';
COMMENT ON COLUMN orders.order_payment_slots.status IS
  'pending → matched (đã nhận CK) / cancelled (bị supersede) / expired (cron dọn).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_payment_slots_order_cycle
  ON orders.order_payment_slots (id_order, cycle_index);

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_payment_slots_pending_amount
  ON orders.order_payment_slots (receiver_account, expected_amount)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_order_payment_slots_pending_lookup
  ON orders.order_payment_slots (receiver_account, expected_amount, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_order_payment_slots_order_pending
  ON orders.order_payment_slots (id_order, status, cycle_index DESC);

CREATE INDEX IF NOT EXISTS idx_order_payment_slots_status_created
  ON orders.order_payment_slots (status, created_at);

CREATE OR REPLACE VIEW orders.v_payment_slot_health AS
SELECT
  receiver_account,
  base_amount,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  ARRAY_AGG(amount_suffix ORDER BY amount_suffix) FILTER (WHERE status = 'pending') AS used_suffixes,
  100 - COUNT(*) FILTER (WHERE status = 'pending') AS free_slots,
  MAX(created_at) FILTER (WHERE status = 'pending') AS oldest_pending_at
FROM orders.order_payment_slots
GROUP BY receiver_account, base_amount
HAVING COUNT(*) FILTER (WHERE status = 'pending') > 0;

COMMENT ON VIEW orders.v_payment_slot_health IS
  'Theo dõi slot pending theo (receiver, base_amount). free_slots thấp ⇒ tăng MAXVALUE sequence.';
