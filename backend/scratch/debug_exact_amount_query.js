require('module-alias/register');
const { db } = require('@/db');
const { ORDER_COLS, ORDER_TABLE } = require('../webhook/sepay/config');
const { REFUND_CREDIT_APPLICATIONS_TABLE } = require('../webhook/sepay/routes/webhook/constants');
const { STATUS } = require('@/utils/statuses');

async function debug() {
  try {
    const amount = 400022;
    console.log("Query parameters:", {
      amount,
      unpaid: STATUS.UNPAID,
      renewal: STATUS.RENEWAL,
      ORDER_TABLE,
      REFUND_CREDIT_APPLICATIONS_TABLE,
    });

    const query = `
      SELECT 
        id_order,
        status,
        price,
        ROUND(price::numeric) AS round_price,
        COALESCE(
          (
            SELECT SUM(rca.applied_amount)
            FROM ${REFUND_CREDIT_APPLICATIONS_TABLE} rca
            WHERE rca.target_order_list_id = ${ORDER_TABLE}.${ORDER_COLS.id}
          ), 0
        ) AS credit_applied_amount
      FROM ${ORDER_TABLE}
      LIMIT 10
    `;

    const res = await db.raw(query);
    console.log("\nAll orders first 10 rows:");
    console.table(res.rows);

    const matchQuery = `
      SELECT 
        UPPER(TRIM(${ORDER_COLS.idOrder}::text)) AS id_order
      FROM ${ORDER_TABLE}
      WHERE COALESCE(${ORDER_COLS.status}::text, '') IN (?, ?)
        AND ROUND(${ORDER_COLS.price}::numeric) - COALESCE(
          (
            SELECT SUM(rca.applied_amount)
            FROM ${REFUND_CREDIT_APPLICATIONS_TABLE} rca
            WHERE rca.target_order_list_id = ${ORDER_TABLE}.${ORDER_COLS.id}
          ), 0
        ) = ?
    `;
    const matchRes = await db.raw(matchQuery, [STATUS.UNPAID, STATUS.RENEWAL, amount]);
    console.log("\nMatched rows count:", matchRes.rows.length);
    console.table(matchRes.rows);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

debug();
