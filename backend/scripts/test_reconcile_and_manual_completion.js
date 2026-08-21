require("module-alias/register");
const { pool, ORDER_TABLE, ORDER_COLS, SUPPLIER_TABLE, SUPPLIER_COLS } = require("../webhook/sepay/config");
const { ensureSupplyAndPriceFromOrder, updatePaymentSupplyBalance } = require("../webhook/sepay/payments");
const { isMavnImportOrder, isMavrykShopSupplierName } = require("../src/utils/orderHelpers");
const { normalizeMoney } = require("../webhook/sepay/utils");

const fetchSupplierNameBySupplyId = async (client, supplyIdRaw) => {
  if (supplyIdRaw == null || !Number.isFinite(Number(supplyIdRaw))) return "";
  const { rows } = await client.query(
    `SELECT ${SUPPLIER_COLS.supplierName} FROM ${SUPPLIER_TABLE}
     WHERE ${SUPPLIER_COLS.id} = $1 LIMIT 1`,
    [Number(supplyIdRaw)]
  );
  return String(rows[0]?.[SUPPLIER_COLS.supplierName] ?? "").trim();
};

async function test() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("Setting up test data...");

    // Clean up
    await client.query("DELETE FROM business.supplier_order_cost_log WHERE order_list_id IN (999991, 999992, 999993)");
    await client.query("DELETE FROM business.order_list WHERE id IN (999991, 999992, 999993)");
    await client.query("DELETE FROM business.supplier_cost WHERE variant_id = 999999 OR supplier_id = 999999");
    await client.query("DELETE FROM business.variant WHERE id = 999999");
    await client.query("DELETE FROM business.supplier WHERE id = 999999");

    // 1. Create a test supplier
    await client.query(`
      INSERT INTO business.supplier (id, supplier_name, active_supply)
      VALUES (999999, 'Test Reconcile Supplier', true)
    `);

    // 2. Create a test variant
    await client.query(`
      INSERT INTO business.variant (id, product_id, variant_name, display_name, is_active)
      VALUES (999999, 1, 'test_variant_reconcile', 'Test Reconcile Variant', true)
    `);

    // 3. Create a supplier cost entry
    await client.query(`
      INSERT INTO business.supplier_cost (id, supplier_id, variant_id, price)
      VALUES (999999, 999999, 999999, 120000)
    `);

    // 4. Create a supplier payment slot for the test supplier (so updatePaymentSupplyBalance works)
    await client.query(`
      INSERT INTO business.supplier_payments (supplier_id, payment_period, payment_status, total_import, amount_paid)
      VALUES (999999, '2026-08', 'Chưa Thanh Toán', 0, 0)
      ON CONFLICT DO NOTHING
    `);

    console.log("Test data setup complete.");

    // ==========================================
    // Test Case 1: Manual Completion flow (resolving supplier/cost before status update)
    // ==========================================
    console.log("\n--- TEST CASE 1: Manual Completion Flow ---");
    // Create an unpaid order with the test product variant
    await client.query(`
      INSERT INTO business.order_list (id, id_order, status, id_product, price, cost, supply_id)
      VALUES (999991, 'TEST_MANUAL_1', 'Chưa Thanh Toán', 999999, 150000, NULL, NULL)
    `);

    // Execute the manual completion simulation (resolving supplier and cost before status update)
    let resolvedSupplierId = null;
    let resolvedCost = null;

    const ensured = await ensureSupplyAndPriceFromOrder('TEST_MANUAL_1', {
      referenceImport: 150000,
      client,
    });
    if (ensured?.supplierId) {
      resolvedSupplierId = ensured.supplierId;
      resolvedCost = ensured.price;
    }

    console.log(`Resolved supplier: ${resolvedSupplierId}, cost: ${resolvedCost}`);

    if (resolvedSupplierId !== 999999 || resolvedCost !== 120000) {
      throw new Error(`Test Case 1 failed: Expected supplier 999999 and cost 120000, but got ${resolvedSupplierId} and ${resolvedCost}`);
    }

    // Run the actual status update with resolved values
    await client.query(`
      UPDATE business.order_list
      SET status = 'Đã Thanh Toán',
          supply_id = $1,
          cost = $2
      WHERE id = 999991
    `, [resolvedSupplierId, resolvedCost]);

    // Check if trigger created the supplier cost log entry
    const { rows: logRows1 } = await client.query(
      `SELECT * FROM business.supplier_order_cost_log WHERE order_list_id = 999991`
    );
    console.log("Trigger created log entry:", logRows1);
    if (logRows1.length === 0) {
      throw new Error("Test Case 1 failed: Cost log entry was not created by the trigger!");
    }
    if (Number(logRows1[0].import_cost) !== 120000 || Number(logRows1[0].supply_id) !== 999999) {
      throw new Error(`Test Case 1 failed: Incorrect log entry values: ${JSON.stringify(logRows1[0])}`);
    }

    // Check if supplier balance is credited after manual completion
    await updatePaymentSupplyBalance(resolvedSupplierId, resolvedCost, new Date(), { client });
    const { rows: balanceRows1 } = await client.query(
      `SELECT amount_paid FROM business.supplier_payments WHERE supplier_id = 999999`
    );
    console.log("Supplier payment balance after Case 1:", balanceRows1);
    if (Number(balanceRows1[0].amount_paid) !== 120000) {
      throw new Error(`Test Case 1 failed: Supplier balance not credited correctly! Expected 120000, got ${balanceRows1[0].amount_paid}`);
    }

    // ==========================================
    // Test Case 2: Reconcile Stuck Orders flow
    // ==========================================
    console.log("\n--- TEST CASE 2: Reconcile Stuck Orders Flow ---");
    // Create a paid order with no supply_id and no cost, and no log entry
    await client.query(`
      INSERT INTO business.order_list (id, id_order, status, id_product, price, cost, supply_id)
      VALUES (999992, 'TEST_MANUAL_2', 'Đã Thanh Toán', 999999, 150000, NULL, NULL)
    `);

    // Now run our stuck orders reconciliation logic for TEST_MANUAL_2
    const orderCode = 'TEST_MANUAL_2';
    const order = (await client.query(`SELECT * FROM business.order_list WHERE id_order = 'TEST_MANUAL_2'`)).rows[0];

    const ensured2 = await ensureSupplyAndPriceFromOrder(orderCode, {
      referenceImport: normalizeMoney(order[ORDER_COLS.price]),
      client,
    });

    if (!ensured2) {
      throw new Error("Test Case 2 failed: Could not resolve supplier/price for order");
    }

    const { supplierId: sId2, price: c2 } = ensured2;
    console.log(`Reconcile resolved supplierId: ${sId2}, cost: ${c2}`);

    if (sId2 !== 999999 || c2 !== 120000) {
      throw new Error(`Test Case 2 failed: Incorrect resolved values: supplier ${sId2}, cost ${c2}`);
    }

    // Check log row existence
    const { rows: logRows2 } = await client.query(
      `SELECT id FROM business.supplier_order_cost_log WHERE order_list_id = 999992`
    );

    if (logRows2.length === 0) {
      console.log("Manual insert of missing supplier cost log");
      await client.query(
        `INSERT INTO business.supplier_order_cost_log (
          order_list_id,
          supply_id,
          id_order,
          import_cost,
          refund_amount,
          ncc_payment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [999992, sId2, orderCode, c2, 0, 'Chưa Thanh Toán']
      );
    }

    // Verify cost log exists now
    const { rows: finalLogRows2 } = await client.query(
      `SELECT * FROM business.supplier_order_cost_log WHERE order_list_id = 999992`
    );
    console.log("Cost log entry after reconcile:", finalLogRows2);
    if (finalLogRows2.length === 0) {
      throw new Error("Test Case 2 failed: Cost log entry does not exist after reconciliation!");
    }

    // Credit supplier balance
    await updatePaymentSupplyBalance(sId2, c2, new Date(), { client });
    const { rows: balanceRows2 } = await client.query(
      `SELECT amount_paid FROM business.supplier_payments WHERE supplier_id = 999999`
    );
    console.log("Supplier payment balance after Case 2:", balanceRows2);
    if (Number(balanceRows2[0].amount_paid) !== 240000) { // 120k + 120k
      throw new Error(`Test Case 2 failed: Supplier balance not credited correctly! Expected 240000, got ${balanceRows2[0].amount_paid}`);
    }

    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
    await client.query("ROLLBACK");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Test failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

test();
