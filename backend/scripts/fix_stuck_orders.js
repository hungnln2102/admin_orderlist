const path = require("path");
// Register module aliases to support @ imports
require("module-alias/register");

const { pool, ORDER_TABLE, ORDER_COLS } = require("../webhook/sepay/config");
const { ensureSupplyAndPriceFromOrder, updatePaymentSupplyBalance } = require("../webhook/sepay/payments");
const { isMavnImportOrder, isMavrykShopSupplierName } = require("../src/utils/orderHelpers");
const { normalizeMoney } = require("../webhook/sepay/utils");

const fetchSupplierNameBySupplyId = async (client, supplyIdRaw) => {
  const { SUPPLIER_TABLE, SUPPLIER_COLS } = require("../webhook/sepay/config");
  if (supplyIdRaw == null || !Number.isFinite(Number(supplyIdRaw))) return "";
  const { rows } = await client.query(
    `SELECT ${SUPPLIER_COLS.supplierName} FROM ${SUPPLIER_TABLE}
     WHERE ${SUPPLIER_COLS.id} = $1 LIMIT 1`,
    [Number(supplyIdRaw)]
  );
  return String(rows[0]?.[SUPPLIER_COLS.supplierName] ?? "").trim();
};

async function main() {
  console.log("Starting stuck orders fix script...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check for specific order codes passed as arguments
    const args = process.argv.slice(2);
    const filterByCodes = args.filter(arg => !arg.startsWith("-") && arg.trim() !== "");

    // Query orders with status 'Đang Xử Lý' or 'Đã Thanh Toán'
    // that have a product_name and DO NOT have a log entry in business.supplier_order_cost_log
    let query = `
      SELECT o.*
      FROM ${ORDER_TABLE} o
      LEFT JOIN business.supplier_order_cost_log l ON l.order_list_id = o.id
      WHERE o.status IN ('Đang Xử Lý', 'Đã Thanh Toán')
        AND l.id IS NULL
        AND o.${ORDER_COLS.idProduct} IS NOT NULL
    `;
    
    let params = [];
    if (filterByCodes.length > 0) {
      const placeholders = filterByCodes.map((_, idx) => `$${idx + 1}`).join(", ");
      query += ` AND UPPER(o.${ORDER_COLS.idOrder}) IN (${placeholders}) `;
      params = filterByCodes.map(c => c.trim().toUpperCase());
      console.log(`Filtering for specific order codes:`, filterByCodes);
    }

    query += ` ORDER BY o.id ASC `;

    const { rows: orders } = await client.query(query, params);
    console.log(`Found ${orders.length} potentially stuck orders to check.`);

    let processedCount = 0;
    let balanceUpdatedCount = 0;

    for (const order of orders) {
      const orderCode = String(order[ORDER_COLS.idOrder] || "").trim().toUpperCase();
      const status = order.status;

      if (isMavnImportOrder({ id_order: orderCode })) {
        console.log(`Skipping MAVN import order: ${orderCode}`);
        continue;
      }

      console.log(`\n----------------------------------------`);
      console.log(`Processing order ${orderCode} (id: ${order.id}, status: ${status}, current supply_id: ${order[ORDER_COLS.idSupply]})`);

      // Resolve supplier and cost
      const ensured = await ensureSupplyAndPriceFromOrder(orderCode, {
        referenceImport: normalizeMoney(order[ORDER_COLS.price]),
        client,
      });

      if (!ensured) {
        console.log(`Could not resolve supplier/price for order ${orderCode}. Skipping.`);
        continue;
      }

      const { supplierId, price: cost } = ensured;
      console.log(`Resolved supplierId: ${supplierId}, cost: ${cost} for order ${orderCode}`);

      if (supplierId) {
        // Check if log row exists now (in case ensureSupplyAndPriceFromOrder triggered it via update)
        const { rows: logRows } = await client.query(
          `SELECT id FROM business.supplier_order_cost_log WHERE order_list_id = $1`,
          [order.id]
        );

        if (logRows.length === 0) {
          console.log(`Trigger did not fire for order ${order.id}. Manually inserting supplier cost log.`);
          await client.query(
            `INSERT INTO business.supplier_order_cost_log (
              order_list_id,
              supply_id,
              id_order,
              import_cost,
              refund_amount,
              ncc_payment_status
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING`,
            [
              order.id,
              supplierId,
              orderCode,
              cost || 0,
              0,
              'Chưa Thanh Toán'
            ]
          );
        } else {
          console.log(`Supplier cost log successfully created via trigger for order ${order.id}`);
        }

        // Credit the supplier balance if it's not Mavryk
        const supplierName = await fetchSupplierNameBySupplyId(client, supplierId);
        if (!isMavrykShopSupplierName(supplierName)) {
          if (Number.isFinite(cost) && cost > 0) {
            console.log(`Crediting supplier balance: supplierName: ${supplierName}, amount: ${cost}`);
            await updatePaymentSupplyBalance(supplierId, cost, new Date(), { client });
            balanceUpdatedCount++;
          }
        }
        processedCount++;
      } else {
        console.log(`No supplier ID resolved for order ${orderCode}`);
      }
    }

    await client.query("COMMIT");
    console.log(`\n========================================`);
    console.log(`Successfully completed migration! Processed ${processedCount} orders, updated ${balanceUpdatedCount} supplier balances.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolled back.", err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

main();
