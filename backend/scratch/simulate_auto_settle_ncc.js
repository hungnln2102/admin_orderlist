/**
 * Script giả lập thanh toán NCC tự động qua webhook outbound.
 * 
 * Luồng:
 * 1. Tìm NCC có công nợ "Chưa Thanh Toán"
 * 2. Encode số tiền với supplier signature
 * 3. Gọi processWebhookTransactionAsync() trực tiếp (giống SePay webhook)
 * 4. Kiểm tra kết quả: NCC đã chuyển "Đã Thanh Toán" chưa
 */
require('module-alias/register');

const { db } = require('@/db');
const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName } = require('@/config/dbSchema');
const { STATUS } = require('@/utils/statuses');
const { parseWebhookTransaction } = require('../webhook/sepay/routes/webhook/parsePhase');
const { processWebhookTransactionAsync } = require('../webhook/sepay/routes/webhook/postHandler');
const { encodeSupplierSignature } = require('../webhook/sepay/routes/webhook/supplierPaymentSignature');

const SUPPLIER_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_PARTNER);
const SUPPLIER_ORDER_COST_LOG_TABLE = tableName(PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE, SCHEMA_PARTNER);
const supplierOrderCostCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;
const PAYMENT_SUPPLY_TABLE = tableName(PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE, SCHEMA_PARTNER);

async function run() {
  try {
    console.log("=== BAT DAU GIA LAP THANH TOAN NCC ===\n");

    // 1. Tim TAT CA NCC co cong no chua thanh toan
    const suppliers = await db(SUPPLIER_TABLE).select('id', 'supplier_name');
    console.log("--- DANH SACH NCC ---");
    
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
        console.log(`  NCC ID=${s.id} "${s.supplier_name}": ${unpaidCount} don chua TT, no = ${netUnpaid}d`);
        // Ưu tiên NCC có nợ là bội 1000 để signature decode hoạt động
        if (!targetSupplier || (netUnpaid % 1000 === 0 && targetUnpaidAmount % 1000 !== 0)) {
          targetSupplier = s;
          targetUnpaidAmount = netUnpaid;
        }
      }
    }

    if (!targetSupplier) {
      console.log("\nKhong tim thay NCC nao co cong no chua thanh toan.");
      process.exit(0);
    }

    console.log(`\nChon NCC: ID=${targetSupplier.id} "${targetSupplier.supplier_name}"`);
    console.log(`   No goc: ${targetUnpaidAmount}d`);

    // 2. Encode supplier signature
    const signedAmount = encodeSupplierSignature(targetUnpaidAmount, targetSupplier.id);
    console.log(`   So tien sau encode signature: ${signedAmount}d`);
    console.log(`   (Offset = ${targetUnpaidAmount - signedAmount}, supplierId = ${targetSupplier.id})`);

    // 3. Tao payload gia lap SePay webhook tien ra
    const reqBody = {
      id: Date.now(),
      gateway: "MBBank",
      transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      account_number: "0378304963",
      transfer_type: "out",
      transfer_amount: signedAmount,
      accumulated: 0,
      code: null,
      transaction_content: `MBCT NGO LE NGOC HUNG chuyen tien SIM_TEST_${Date.now()}`,
      reference_number: `SIM${Date.now()}`,
      description: `Simulate outbound NCC ${targetSupplier.supplier_name}`,
    };

    console.log("\n--- PAYLOAD WEBHOOK GIA LAP ---");
    console.log(JSON.stringify(reqBody, null, 2));

    // 4. Parse & xu ly webhook
    const parsed = parseWebhookTransaction(reqBody);
    console.log("\n--- PARSED RESULT ---");
    console.log(`   transferAmountNormalized: ${parsed.transferAmountNormalized}`);
    console.log(`   supplierSettlementTransfer: ${parsed.supplierSettlementTransfer}`);

    console.log("\n--- BAT DAU XU LY WEBHOOK ---");
    await processWebhookTransactionAsync(reqBody, parsed);
    console.log("--- WEBHOOK XU LY XONG ---\n");

    // 5. Kiem tra ket qua
    console.log("=== KIEM TRA KET QUA ===\n");

    // 5a. Kiem tra supplier_order_cost_log
    const afterLogs = await db(SUPPLIER_ORDER_COST_LOG_TABLE)
      .where({ supply_id: targetSupplier.id })
      .select('id', 'order_list_id', 'import_cost', 'ncc_payment_status', 'logged_at')
      .orderBy('id', 'desc')
      .limit(10);
    console.log(`--- COST LOG SAU KHI THANH TOAN (NCC ${targetSupplier.id}) ---`);
    console.table(afterLogs.map(l => ({
      id: l.id,
      order_list_id: l.order_list_id,
      import_cost: l.import_cost,
      status: l.ncc_payment_status,
      logged_at: l.logged_at,
    })));

    const stillUnpaid = afterLogs.filter(l => 
      String(l.ncc_payment_status || '').trim() !== STATUS.PAID
    );

    // 5b. Kiem tra payment_supply
    const latestPayment = await db(PAYMENT_SUPPLY_TABLE)
      .where({ supplier_id: targetSupplier.id })
      .orderBy('id', 'desc')
      .first();
    console.log("--- PAYMENT SUPPLY MOI NHAT ---");
    if (latestPayment) {
      console.log(`   ID: ${latestPayment.id}`);
      console.log(`   Status: ${latestPayment.status}`);
      console.log(`   Amount Paid: ${Number(latestPayment.amount_paid)}d`);
      console.log(`   Period: ${latestPayment.payment_period}`);
    } else {
      console.log("   Chua co ban ghi payment_supply nao.");
    }

    // 5c. Ket luan
    console.log("\n=== KET LUAN ===");
    if (stillUnpaid.length === 0) {
      console.log(`THANH CONG! Tat ca don cua NCC "${targetSupplier.supplier_name}" da chuyen thanh "Da Thanh Toan".`);
    } else {
      console.log(`Van con ${stillUnpaid.length} don chua thanh toan.`);
    }

  } catch (err) {
    console.error("\nLOI:", err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

run();
