/**
 * Hằng số dùng chung cho domain payment-slots.
 */

const SLOT_KIND = Object.freeze({
  NEW: "new",
  RENEWAL: "renewal",
});

const SLOT_STATUS = Object.freeze({
  PENDING: "pending",
  MATCHED: "matched",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
});

const SUFFIX_SEQUENCE = "orders.payment_amount_suffix_seq";
/** MAXVALUE của sequence — phải khớp với migration 107. */
const SUFFIX_MAX = 100;

const SLOTS_TABLE = "orders.order_payment_slots";

const SLOT_COLS = Object.freeze({
  ID: "id",
  ID_ORDER: "id_order",
  RECEIVER_ACCOUNT: "receiver_account",
  CYCLE_INDEX: "cycle_index",
  SLOT_KIND: "slot_kind",
  BASE_AMOUNT: "base_amount",
  AMOUNT_SUFFIX: "amount_suffix",
  EXPECTED_AMOUNT: "expected_amount",
  STATUS: "status",
  CREATED_AT: "created_at",
  MATCHED_AT: "matched_at",
  PAYMENT_RECEIPT_ID: "payment_receipt_id",
  CANCELLED_AT: "cancelled_at",
  CANCELLED_REASON: "cancelled_reason",
});

/** Số attempt tối đa khi cấp suffix. Lớn hơn MAXVALUE để chắc chắn quét hết range. */
const MAX_SUFFIX_ATTEMPTS = 120;

/** Postgres advisory lock key cho serialization openPaymentSlot theo từng đơn. */
const ADVISORY_LOCK_DOMAIN = "payment_slot:order";

/** Postgres error code cho unique violation. */
const PG_UNIQUE_VIOLATION = "23505";

module.exports = {
  SLOT_KIND,
  SLOT_STATUS,
  SUFFIX_SEQUENCE,
  SUFFIX_MAX,
  SLOTS_TABLE,
  SLOT_COLS,
  MAX_SUFFIX_ATTEMPTS,
  ADVISORY_LOCK_DOMAIN,
  PG_UNIQUE_VIOLATION,
};
