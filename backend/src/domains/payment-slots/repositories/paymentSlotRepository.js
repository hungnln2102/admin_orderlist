/**
 * Truy vấn SQL thuần với bảng `orders.order_payment_slots`.
 * Tất cả hàm nhận `executor` là pg PoolClient/Pool hoặc knex transaction;
 * caller chịu trách nhiệm transaction boundary.
 */

const {
  SLOTS_TABLE,
  SLOT_COLS,
  SLOT_STATUS,
  SUFFIX_SEQUENCE,
  SUFFIX_MAX,
} = require("../constants");

/** Hỗ trợ cả pg.Client (.query) và knex (.raw); chuẩn hoá về {rows}. */
const pgPlaceholdersToKnex = (sql, params = []) => {
  const orderedParams = [];
  const convertedSql = String(sql || "").replace(/\$(\d+)/g, (_match, index) => {
    orderedParams.push(params[Number(index) - 1]);
    return "?";
  });
  return { sql: convertedSql, params: orderedParams };
};

const run = async (executor, sql, params = []) => {
  if (executor && typeof executor.raw === "function") {
    const knexQuery = pgPlaceholdersToKnex(sql, params);
    const res = await executor.raw(knexQuery.sql, knexQuery.params);
    return { rows: res.rows || [], rowCount: res.rowCount ?? (res.rows ? res.rows.length : 0) };
  }
  if (executor && typeof executor.query === "function") {
    return executor.query(sql, params);
  }
  throw new Error("paymentSlotRepository: executor must be pg client or knex");
};

const SELECT_SLOT_FIELDS = `
  ${SLOT_COLS.ID} AS id,
  ${SLOT_COLS.ID_ORDER} AS id_order,
  ${SLOT_COLS.RECEIVER_ACCOUNT} AS receiver_account,
  ${SLOT_COLS.CYCLE_INDEX} AS cycle_index,
  ${SLOT_COLS.SLOT_KIND} AS slot_kind,
  ${SLOT_COLS.BASE_AMOUNT}::numeric AS base_amount,
  ${SLOT_COLS.AMOUNT_SUFFIX} AS amount_suffix,
  ${SLOT_COLS.EXPECTED_AMOUNT}::numeric AS expected_amount,
  ${SLOT_COLS.STATUS} AS status,
  ${SLOT_COLS.CREATED_AT} AS created_at,
  ${SLOT_COLS.MATCHED_AT} AS matched_at,
  ${SLOT_COLS.PAYMENT_RECEIPT_ID} AS payment_receipt_id,
  ${SLOT_COLS.CANCELLED_AT} AS cancelled_at,
  ${SLOT_COLS.CANCELLED_REASON} AS cancelled_reason
`;

/** Lấy max(cycle_index) cho đơn — kế tiếp cho slot mới. */
const fetchNextCycleIndex = async (executor, orderCode) => {
  const { rows } = await run(
    executor,
    `
      SELECT COALESCE(MAX(${SLOT_COLS.CYCLE_INDEX}), 0)::int + 1 AS next_cycle
      FROM ${SLOTS_TABLE}
      WHERE ${SLOT_COLS.ID_ORDER} = $1
    `,
    [orderCode]
  );
  return Number(rows?.[0]?.next_cycle || 1);
};

/** Huỷ tất cả slot pending của đơn (khi mở slot mới override slot cũ). */
const cancelPendingSlotsForOrder = async (executor, orderCode, reason) => {
  const { rowCount } = await run(
    executor,
    `
      UPDATE ${SLOTS_TABLE}
      SET ${SLOT_COLS.STATUS} = '${SLOT_STATUS.CANCELLED}',
          ${SLOT_COLS.CANCELLED_AT} = NOW(),
          ${SLOT_COLS.CANCELLED_REASON} = $2
      WHERE ${SLOT_COLS.ID_ORDER} = $1
        AND ${SLOT_COLS.STATUS} = '${SLOT_STATUS.PENDING}'
    `,
    [orderCode, String(reason || "").slice(0, 200)]
  );
  return Number(rowCount || 0);
};

/** Lấy suffix tiếp theo từ sequence (atomic, CYCLE 1..100). */
const fetchNextSuffix = async (executor) => {
  const { rows } = await run(
    executor,
    `SELECT nextval('${SUFFIX_SEQUENCE}')::int AS suffix`
  );
  return Number(rows?.[0]?.suffix || 0);
};

/**
 * Pick the next suffix that is not occupied by a pending slot for this receiver/base amount.
 * The sequence value is still used as a rotating start point, but occupied suffixes are skipped.
 */
const fetchNextAvailableSuffix = async (executor, { receiverAccount, baseAmount }) => {
  const { rows } = await run(
    executor,
    `
      WITH config AS (
        SELECT $3::int AS max_suffix
      ), seed AS (
        SELECT nextval('${SUFFIX_SEQUENCE}')::int AS suffix
      ), candidates AS (
        SELECT ((seed.suffix - 1 + gs.offset) % config.max_suffix)::int + 1 AS suffix,
               gs.offset AS offset
        FROM seed
        CROSS JOIN config
        CROSS JOIN generate_series(0, config.max_suffix - 1) AS gs(offset)
      )
      SELECT candidates.suffix
      FROM candidates
      WHERE NOT EXISTS (
        SELECT 1
        FROM ${SLOTS_TABLE} slots
        WHERE slots.${SLOT_COLS.RECEIVER_ACCOUNT} = $1
          AND slots.${SLOT_COLS.STATUS} = '${SLOT_STATUS.PENDING}'
          AND slots.${SLOT_COLS.EXPECTED_AMOUNT} = ($2::numeric + candidates.suffix)
      )
      ORDER BY candidates.offset ASC
      LIMIT 1
    `,
    [receiverAccount, baseAmount, SUFFIX_MAX]
  );
  return Number(rows?.[0]?.suffix || 0);
};

/**
 * INSERT slot. Pending amount conflicts return null via DO NOTHING,
 * so caller can retry next suffix without aborting the transaction.
 */
const insertSlot = async (executor, payload) => {
  const {
    orderCode,
    receiverAccount,
    cycleIndex,
    slotKind,
    baseAmount,
    amountSuffix,
    expectedAmount,
  } = payload;

  const { rows } = await run(
    executor,
    `
      INSERT INTO ${SLOTS_TABLE} (
        ${SLOT_COLS.ID_ORDER},
        ${SLOT_COLS.RECEIVER_ACCOUNT},
        ${SLOT_COLS.CYCLE_INDEX},
        ${SLOT_COLS.SLOT_KIND},
        ${SLOT_COLS.BASE_AMOUNT},
        ${SLOT_COLS.AMOUNT_SUFFIX},
        ${SLOT_COLS.EXPECTED_AMOUNT}
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (${SLOT_COLS.RECEIVER_ACCOUNT}, ${SLOT_COLS.EXPECTED_AMOUNT})
      WHERE ${SLOT_COLS.STATUS} = '${SLOT_STATUS.PENDING}'
      DO NOTHING
      RETURNING ${SELECT_SLOT_FIELDS}
    `,
    [
      orderCode,
      receiverAccount,
      cycleIndex,
      slotKind,
      baseAmount,
      amountSuffix,
      expectedAmount,
    ]
  );
  return rows[0] || null;
};

/** Tra slot pending theo (receiver, expected_amount) — dùng cho webhook resolve. */
const findPendingSlotByAmount = async (
  executor,
  { receiverAccount, expectedAmount }
) => {
  const { rows } = await run(
    executor,
    `
      SELECT ${SELECT_SLOT_FIELDS}
      FROM ${SLOTS_TABLE}
      WHERE ${SLOT_COLS.RECEIVER_ACCOUNT} = $1
        AND ${SLOT_COLS.EXPECTED_AMOUNT} = $2
        AND ${SLOT_COLS.STATUS} = '${SLOT_STATUS.PENDING}'
      ORDER BY ${SLOT_COLS.CREATED_AT} ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `,
    [receiverAccount, expectedAmount]
  );
  return rows[0] || null;
};

/** Lấy slot pending mới nhất theo đơn (UI / build QR). */
const findLatestPendingSlotByOrder = async (executor, orderCode) => {
  const { rows } = await run(
    executor,
    `
      SELECT ${SELECT_SLOT_FIELDS}
      FROM ${SLOTS_TABLE}
      WHERE ${SLOT_COLS.ID_ORDER} = $1
        AND ${SLOT_COLS.STATUS} = '${SLOT_STATUS.PENDING}'
      ORDER BY ${SLOT_COLS.CYCLE_INDEX} DESC
      LIMIT 1
    `,
    [orderCode]
  );
  return rows[0] || null;
};

/** Lấy slot matched gần nhất theo đơn (runRenewal đọc giá đã chốt). */
const findLatestMatchedSlotByOrder = async (executor, orderCode) => {
  const { rows } = await run(
    executor,
    `
      SELECT ${SELECT_SLOT_FIELDS}
      FROM ${SLOTS_TABLE}
      WHERE ${SLOT_COLS.ID_ORDER} = $1
        AND ${SLOT_COLS.STATUS} = '${SLOT_STATUS.MATCHED}'
      ORDER BY ${SLOT_COLS.CYCLE_INDEX} DESC
      LIMIT 1
    `,
    [orderCode]
  );
  return rows[0] || null;
};

/**
 * Lấy slot "đang active" mới nhất theo đơn — ưu tiên matched (đã có CK),
 * fallback sang pending (đang đợi CK). Dùng cho runRenewal: nếu có matched
 * thì lấy giá đã chốt (= số khách vừa CK); nếu chỉ có pending thì lấy giá
 * đã chốt khi mở slot. Không bao gồm cancelled/expired.
 */
const findActiveSlotByOrder = async (executor, orderCode) => {
  const { rows } = await run(
    executor,
    `
      SELECT ${SELECT_SLOT_FIELDS}
      FROM ${SLOTS_TABLE}
      WHERE ${SLOT_COLS.ID_ORDER} = $1
        AND ${SLOT_COLS.STATUS} IN ('${SLOT_STATUS.MATCHED}', '${SLOT_STATUS.PENDING}')
      ORDER BY
        CASE ${SLOT_COLS.STATUS}
          WHEN '${SLOT_STATUS.MATCHED}' THEN 0
          WHEN '${SLOT_STATUS.PENDING}' THEN 1
          ELSE 2
        END,
        ${SLOT_COLS.CYCLE_INDEX} DESC
      LIMIT 1
    `,
    [orderCode]
  );
  return rows[0] || null;
};

/** Đánh dấu slot matched + gắn receipt id (idempotent). */
const markSlotMatched = async (
  executor,
  { slotId, paymentReceiptId }
) => {
  const { rows } = await run(
    executor,
    `
      UPDATE ${SLOTS_TABLE}
      SET ${SLOT_COLS.STATUS} = '${SLOT_STATUS.MATCHED}',
          ${SLOT_COLS.MATCHED_AT} = NOW(),
          ${SLOT_COLS.PAYMENT_RECEIPT_ID} = $2
      WHERE ${SLOT_COLS.ID} = $1
        AND ${SLOT_COLS.STATUS} = '${SLOT_STATUS.PENDING}'
      RETURNING ${SELECT_SLOT_FIELDS}
    `,
    [Number(slotId), paymentReceiptId == null ? null : Number(paymentReceiptId)]
  );
  return rows[0] || null;
};

/** Đánh dấu expired hàng loạt slot quá hạn (cron). */
const expireStaleSlots = async (executor, { olderThanInterval }) => {
  const { rowCount } = await run(
    executor,
    `
      UPDATE ${SLOTS_TABLE}
      SET ${SLOT_COLS.STATUS} = '${SLOT_STATUS.EXPIRED}',
          ${SLOT_COLS.CANCELLED_AT} = NOW(),
          ${SLOT_COLS.CANCELLED_REASON} = 'expired_no_payment'
      WHERE ${SLOT_COLS.STATUS} = '${SLOT_STATUS.PENDING}'
        AND ${SLOT_COLS.CREATED_AT} < NOW() - $1::interval
    `,
    [String(olderThanInterval || "30 days")]
  );
  return Number(rowCount || 0);
};

/** Advisory xact lock per đơn — serialize openPaymentSlot cho cùng id_order. */
const acquireOrderAdvisoryLock = async (executor, orderCode) => {
  await run(
    executor,
    `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
    ["payment_slot:order", String(orderCode || "")]
  );
};

module.exports = {
  fetchNextCycleIndex,
  cancelPendingSlotsForOrder,
  fetchNextSuffix,
  fetchNextAvailableSuffix,
  insertSlot,
  findPendingSlotByAmount,
  findLatestPendingSlotByOrder,
  findLatestMatchedSlotByOrder,
  findActiveSlotByOrder,
  markSlotMatched,
  expireStaleSlots,
  acquireOrderAdvisoryLock,
};
