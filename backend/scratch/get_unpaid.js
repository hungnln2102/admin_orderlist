require('module-alias/register');
const { db } = require('@/db');
const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName } = require('@/config/dbSchema');
const { STATUS } = require('@/utils/statuses');

const SUPPLIER_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_PARTNER);
const SUPPLIER_ORDER_COST_LOG_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE, SCHEMA_PARTNER);
const supplierOrderCostCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;

async function run() {
  const suppliers = await db(SUPPLIER_TABLE).select('id', 'supplier_name');
  let targetSupplier = null;
  let targetUnpaidAmount = 0;

  for (const s of suppliers) {
    const summary = await db.raw(`
      WITH latest AS (
        SELECT DISTINCT ON (l.${supplierOrderCostCols.ORDER_LIST_ID})
          l.${supplierOrderCostCols.IMPORT_COST} AS import_cost,
          l.${supplierOrderCostCols.REFUND_AMOUNT} AS refund_amount,
          l.${supplierOrderCostCols.NCC_PAYMENT_STATUS} AS ncc_payment_status
        FROM ${SUPPLIER_ORDER_COST_LOG_TABLE} l
        WHERE l.${supplierOrderCostCols.SUPPLY_ID} = ?
        ORDER BY l.${supplierOrderCostCols.ORDER_LIST_ID}, l.${supplierOrderCostCols.ID} DESC
      )
      SELECT
        COUNT(*) FILTER (
          WHERE TRIM(COALESCE(ncc_payment_status::text, '')) <> ?
        )::int AS unpaid_count,
        COALESCE(SUM(
          CASE
            WHEN TRIM(COALESCE(ncc_payment_status::text, '')) = ?
            THEN 0::numeric
            ELSE COALESCE(import_cost, 0)::numeric - COALESCE(refund_amount, 0)::numeric
          END
        ), 0)::numeric AS net_unpaid_amount
      FROM latest;
    `, [s.id, STATUS.PAID, STATUS.PAID]);

    const row = summary.rows[0] || {};
    const unpaidCount = Number(row.unpaid_count) || 0;
    const netUnpaid = Number(row.net_unpaid_amount) || 0;

    if (unpaidCount > 0 && netUnpaid > 0) {
      console.log(`Unpaid supplier: ID=${s.id}, name="${s.supplier_name}", count=${unpaidCount}, amount=${netUnpaid}`);
      if (!targetSupplier || (netUnpaid % 1000 === 0 && targetUnpaidAmount % 1000 !== 0)) {
        targetSupplier = s;
        targetUnpaidAmount = netUnpaid;
      }
    }
  }

  if (targetSupplier) {
    console.log(`\nTARGET_SUPPLIER_ID=${targetSupplier.id}`);
    console.log(`TARGET_SUPPLIER_NAME=${targetSupplier.supplier_name}`);
  } else {
    console.log("NO_UNPAID_SUPPLIER");
  }
  process.exit(0);
}

run();
