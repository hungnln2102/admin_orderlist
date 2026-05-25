const { STATUS } = require("../../../../utils/statuses");
const { ORDERS_SCHEMA } = require("../../../../config/dbSchema");
const { SLOTS_TABLE, SLOT_COLS, SLOT_STATUS } = require("../../constants");

const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;
const ORDER_TABLE = `orders.${ORDERS_SCHEMA.ORDER_LIST.TABLE}`;

const DEFAULT_BATCH_LIMIT = 500;

const normalizeLimit = (value) => {
  const num = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(num) || num <= 0) return DEFAULT_BATCH_LIMIT;
  return Math.min(num, 5000);
};

/**
 * @param {import('pg').PoolClient} client
 * @param {{ limit?: number|string, orderCode?: string }} options
 */
async function fetchRenewalSuffixCandidates(client, options = {}) {
  const params = [STATUS.RENEWAL];
  let orderFilter = "";
  const code = String(options.orderCode || "").trim();
  if (code) {
    params.push(code);
    orderFilter = `AND LOWER(TRIM(o.${ORDER_COLS.ID_ORDER}::text)) = LOWER($${params.length})`;
  }

  params.push(normalizeLimit(options.limit));

  const sql = `
    SELECT
      o.${ORDER_COLS.ID_ORDER} AS id_order,
      o.${ORDER_COLS.PRICE}::numeric AS price,
      o.${ORDER_COLS.ID_PRODUCT} AS id_product,
      o.${ORDER_COLS.ID_SUPPLY} AS id_supply,
      o.${ORDER_COLS.COST}::numeric AS cost,
      ps.slot_id,
      ps.slot_expected_amount,
      ps.slot_amount_suffix
    FROM ${ORDER_TABLE} o
    LEFT JOIN LATERAL (
      SELECT
        s.${SLOT_COLS.ID} AS slot_id,
        s.${SLOT_COLS.EXPECTED_AMOUNT}::numeric AS slot_expected_amount,
        s.${SLOT_COLS.AMOUNT_SUFFIX}::int AS slot_amount_suffix
      FROM ${SLOTS_TABLE} s
      WHERE s.${SLOT_COLS.ID_ORDER} = o.${ORDER_COLS.ID_ORDER}
        AND s.${SLOT_COLS.STATUS} = '${SLOT_STATUS.PENDING}'
      ORDER BY s.${SLOT_COLS.CYCLE_INDEX} DESC
      LIMIT 1
    ) ps ON TRUE
    WHERE o.${ORDER_COLS.STATUS} = $1
      AND COALESCE(o.${ORDER_COLS.PRICE}::numeric, 0) > 0
      AND UPPER(TRIM(o.${ORDER_COLS.ID_ORDER}::text)) NOT LIKE 'MAVN%'
      ${orderFilter}
    ORDER BY o.${ORDER_COLS.ID_ORDER}
    LIMIT $${params.length}
  `;

  const { rows } = await client.query(sql, params);
  return rows || [];
}

module.exports = {
  fetchRenewalSuffixCandidates,
  normalizeLimit,
};
