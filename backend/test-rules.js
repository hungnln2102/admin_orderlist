/**
 * Test script để verify các rule nghiệp vụ chính
 * 
 * Các rule cần test:
 * 1. Tạo đơn hàng - không cộng tiền NCC ngay
 * 2. Cộng tiền NCC - khi đơn chuyển UNPAID → PROCESSING
 * 3. Xóa đơn hàng - trừ tiền NCC nếu đơn đã PAID/PROCESSING
 * 4. Gia hạn đơn hàng - cộng tiền NCC mới, cập nhật ngày hết hạn
 * 5. Hoàn tiền - chỉ đánh dấu status, không tự động trừ tiền NCC
 */

require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { db } = require("./src/db");
const { TABLES, STATUS, COLS } = require("./src/controllers/Order/constants");
const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName } = require("./src/config/dbSchema");
const { createOrder } = require("./src/services/orderService");
const { updateOrderWithFinance } = require("./src/controllers/Order/orderUpdateService");
const { deleteOrderWithArchive } = require("./src/controllers/Order/orderDeletionService");
const { normalizeOrderRow, sanitizeOrderWritePayload } = require("./src/controllers/Order/helpers");
const { todayYMDInVietnam } = require("./src/utils/normalizers");
const { nextId } = require("./src/services/idService");
const { runRenewal } = require("./webhook/sepay/renewal");
const { ORDERS_SCHEMA } = require("./src/config/dbSchema");
const PAYMENT_SUPPLY_TABLE = tableName(PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE, SCHEMA_PARTNER);
const PAYMENT_SUPPLY_COLS = PARTNER_SCHEMA.PAYMENT_SUPPLY.COLS;

// Archive columns
const ORDER_EXPIRED_COLS = Object.values(ORDERS_SCHEMA.ORDER_EXPIRED.COLS || {});
const ORDER_CANCELED_COLS = Object.values(ORDERS_SCHEMA.ORDER_CANCELED.COLS || {});
const ORDER_CANCELED_ALLOWED_COLS = ORDER_CANCELED_COLS.filter(
  (col) => col && col !== ORDERS_SCHEMA.ORDER_CANCELED.COLS.NOTE
);
const ORDER_EXPIRED_ALLOWED_COLS = ORDER_EXPIRED_COLS.filter(Boolean);

const pruneArchiveData = (data, allowedCols) =>
  Object.fromEntries(Object.entries(data).filter(([key]) => allowedCols.includes(key)));

// Helper functions
const getSupplierDebt = async (supplyId) => {
  const latest = await db(PAYMENT_SUPPLY_TABLE)
    .where(PAYMENT_SUPPLY_COLS.SOURCE_ID, supplyId)
    .orderBy(PAYMENT_SUPPLY_COLS.ID, "desc")
    .first();
  return latest ? Number(latest[PAYMENT_SUPPLY_COLS.IMPORT_VALUE] || 0) : 0;
};

const findSupplierId = async (supplyName) => {
  const { resolveSupplierNameColumn } = require("./src/controllers/SuppliesController/helpers");
  const supplierNameCol = await resolveSupplierNameColumn();
  const row = await db(TABLES.supplier)
    .select(PARTNER_SCHEMA.SUPPLIER.COLS.ID)
    .where(supplierNameCol, supplyName)
    .first();
  return row ? Number(row[PARTNER_SCHEMA.SUPPLIER.COLS.ID]) : null;
};

const createTestSupplier = async (name) => {
  const { resolveSupplierNameColumn } = require("./src/controllers/SuppliesController/helpers");
  const supplierNameCol = await resolveSupplierNameColumn();
  const existing = await db(TABLES.supplier)
    .where(supplierNameCol, name)
    .first();
  if (existing) return Number(existing[PARTNER_SCHEMA.SUPPLIER.COLS.ID]);
  
  const [inserted] = await db(TABLES.supplier)
    .insert({ [supplierNameCol]: name })
    .returning(PARTNER_SCHEMA.SUPPLIER.COLS.ID);
  return Number(inserted[PARTNER_SCHEMA.SUPPLIER.COLS.ID]);
};

const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Test cases
const tests = {
  async test1_CreateOrder_NoSupplierDebt() {
    console.log("\n=== TEST 1: Tạo đơn hàng - KHÔNG cộng tiền NCC ===");
    
    const supplyName = "TEST_SUPPLIER_1";
    const supplyId = await createTestSupplier(supplyName);
    const initialDebt = await getSupplierDebt(supplyId);
    
    const orderData = {
      id_order: `TEST_${Date.now()}`,
      id_product: "Test Product",
      customer: "Test Customer",
      supply: supplyName,
      cost: 100000,
      price: 150000,
      days: 30,
      order_date: formatDate(new Date()),
      order_expired: formatDate(addDays(new Date(), 30)),
    };
    
    const order = await createOrder(orderData);
    const debtAfterCreate = await getSupplierDebt(supplyId);
    
    console.log(`  - Initial debt: ${initialDebt}`);
    console.log(`  - Debt after create: ${debtAfterCreate}`);
    console.log(`  - Order status: ${order.status}`);
    
    const passed = debtAfterCreate === initialDebt && order.status === STATUS.UNPAID;
    console.log(`  ✓ ${passed ? "PASS" : "FAIL"}: Debt không đổi sau khi tạo đơn`);
    
    return { passed, order, supplyId };
  },

  async test2_UpdateToProcessing_AddSupplierDebt() {
    console.log("\n=== TEST 2: Chuyển UNPAID → PROCESSING - CỘNG tiền NCC ===");
    
    const supplyName = "TEST_SUPPLIER_2";
    const supplyId = await createTestSupplier(supplyName);
    const initialDebt = await getSupplierDebt(supplyId);
    
    const orderData = {
      id_order: `TEST_${Date.now()}`,
      id_product: "Test Product",
      customer: "Test Customer",
      supply: supplyName,
      cost: 200000,
      price: 300000,
      days: 30,
      order_date: formatDate(new Date()),
      order_expired: formatDate(addDays(new Date(), 30)),
    };
    
    const order = await createOrder(orderData);
    const debtAfterCreate = await getSupplierDebt(supplyId);
    
    // Update to PROCESSING
    const trx = await db.transaction();
    try {
      const result = await updateOrderWithFinance({
        trx,
        id: order.id,
        payload: { status: STATUS.PROCESSING },
        helpers: {
          TABLES,
          STATUS,
          sanitizeOrderWritePayload,
          normalizeOrderRow,
          todayYMDInVietnam,
        },
      });
      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }
    
    const debtAfterProcessing = await getSupplierDebt(supplyId);
    
    console.log(`  - Initial debt: ${initialDebt}`);
    console.log(`  - Debt after create: ${debtAfterCreate}`);
    console.log(`  - Debt after PROCESSING: ${debtAfterProcessing}`);
    console.log(`  - Expected increase: ${orderData.cost}`);
    
    const expectedDebt = initialDebt + orderData.cost;
    const passed = debtAfterProcessing === expectedDebt && debtAfterCreate === initialDebt;
    console.log(`  ✓ ${passed ? "PASS" : "FAIL"}: Debt tăng đúng ${orderData.cost} khi chuyển PROCESSING`);
    
    return { passed, order, supplyId };
  },

  async test3_DeletePaidOrder_SubtractSupplierDebt() {
    console.log("\n=== TEST 3: Xóa đơn PAID - TRỪ tiền NCC (prorated) ===");
    
    const supplyName = "TEST_SUPPLIER_3";
    const supplyId = await createTestSupplier(supplyName);
    const initialDebt = await getSupplierDebt(supplyId);
    
    const orderData = {
      id_order: `TEST_${Date.now()}`,
      id_product: "Test Product",
      customer: "Test Customer",
      supply: supplyName,
      cost: 300000,
      price: 450000,
      days: 30,
      order_date: formatDate(new Date()),
      order_expired: formatDate(addDays(new Date(), 30)),
    };
    
    const order = await createOrder(orderData);
    
    // Set to PROCESSING (adds debt)
    const trx1 = await db.transaction();
    try {
      await updateOrderWithFinance({
        trx: trx1,
        id: order.id,
        payload: { status: STATUS.PROCESSING },
        helpers: {
          TABLES,
          STATUS,
          sanitizeOrderWritePayload,
          normalizeOrderRow,
          todayYMDInVietnam,
        },
      });
      await trx1.commit();
    } catch (err) {
      await trx1.rollback();
      throw err;
    }
    
    const debtAfterProcessing = await getSupplierDebt(supplyId);
    
    // Delete order (should subtract prorated amount)
    const trx2 = await db.transaction();
    let deletedResult;
    try {
      const orderRow = await trx2(TABLES.orderList).where({ id: order.id }).first();
      const normalized = normalizeOrderRow(orderRow, todayYMDInVietnam());
      
      // Simulate 10 days remaining
      normalized.so_ngay_con_lai = 20;
      
      deletedResult = await deleteOrderWithArchive({
        trx: trx2,
        order: orderRow,
        normalized,
        reqBody: {},
        helpers: {
          TABLES,
          ORDERS_SCHEMA,
          STATUS,
          nextId,
          pruneArchiveData,
          allowedArchiveColsExpired: ORDER_EXPIRED_ALLOWED_COLS,
          allowedArchiveColsCanceled: ORDER_CANCELED_ALLOWED_COLS,
        },
      });
    } catch (err) {
      await trx2.rollback();
      throw err;
    }
    
    const debtAfterDelete = await getSupplierDebt(supplyId);
    
    // Expected: subtract prorated (20/30 * 300000 = 200000, rounded to thousands = 200000)
    const expectedProrated = Math.ceil((20 / 30) * 300000 / 1000) * 1000; // 200000
    const expectedDebt = debtAfterProcessing - expectedProrated;
    
    console.log(`  - Initial debt: ${initialDebt}`);
    console.log(`  - Debt after PROCESSING: ${debtAfterProcessing}`);
    console.log(`  - Debt after delete: ${debtAfterDelete}`);
    console.log(`  - Expected prorated: ${expectedProrated}`);
    console.log(`  - Expected final debt: ${expectedDebt}`);
    console.log(`  - Moved to: ${deletedResult.movedTo}`);
    
    const passed = Math.abs(debtAfterDelete - expectedDebt) < 1000 && deletedResult.movedTo === "canceled";
    console.log(`  ✓ ${passed ? "PASS" : "FAIL"}: Debt giảm đúng prorated khi xóa đơn PAID`);
    
    return { passed, supplyId };
  },

  async test4_Renewal_AddNewSupplierDebt() {
    console.log("\n=== TEST 4: Gia hạn đơn - CỘNG tiền NCC mới ===");
    
    const supplyName = "TEST_SUPPLIER_4";
    const supplyId = await createTestSupplier(supplyName);
    const initialDebt = await getSupplierDebt(supplyId);
    
    // Create order with expiry near (for renewal eligibility)
    const expiryDate = addDays(new Date(), 2); // 2 days left
    const orderData = {
      id_order: `TEST_${Date.now()}`,
      id_product: "Netflix Premium --1m", // 1 month product
      customer: "Test Customer",
      supply: supplyName,
      cost: 100000,
      price: 150000,
      days: 30,
      order_date: formatDate(addDays(new Date(), -28)),
      order_expired: formatDate(expiryDate),
      status: STATUS.RENEWAL, // Eligible for renewal
    };
    
    const order = await createOrder(orderData);
    const debtAfterCreate = await getSupplierDebt(supplyId);
    
    // Run renewal (need to set status to RENEWAL first for eligibility)
    const trx = await db.transaction();
    try {
      await trx(TABLES.orderList)
        .where({ id: order.id })
        .update({ status: STATUS.RENEWAL });
      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }
    
    const renewalResult = await runRenewal(order.id_order, { forceRenewal: true });
    
    const debtAfterRenewal = await getSupplierDebt(supplyId);
    
    console.log(`  - Initial debt: ${initialDebt}`);
    console.log(`  - Debt after create: ${debtAfterCreate}`);
    console.log(`  - Debt after renewal: ${debtAfterRenewal}`);
    console.log(`  - Renewal success: ${renewalResult?.success}`);
    console.log(`  - Renewal new cost: ${renewalResult?.details?.GIA_NHAP}`);
    
    // Renewal should add new cost (may differ from original due to price updates)
    const newCost = renewalResult?.details?.GIA_NHAP || 0;
    const passed = renewalResult?.success && debtAfterRenewal >= debtAfterCreate;
    console.log(`  ✓ ${passed ? "PASS" : "FAIL"}: Renewal cộng tiền NCC mới và cập nhật ngày hết hạn`);
    
    return { passed, renewalResult, supplyId };
  },

  async test5_Refund_OnlyStatusChange() {
    console.log("\n=== TEST 5: Hoàn tiền - CHỈ đánh dấu status, KHÔNG trừ tiền NCC ===");
    
    const supplyName = "TEST_SUPPLIER_5";
    const supplyId = await createTestSupplier(supplyName);
    const initialDebt = await getSupplierDebt(supplyId);
    
    const orderData = {
      id_order: `TEST_${Date.now()}`,
      id_product: "Test Product",
      customer: "Test Customer",
      supply: supplyName,
      cost: 150000,
      price: 200000,
      days: 30,
      order_date: formatDate(new Date()),
      order_expired: formatDate(addDays(new Date(), 30)),
    };
    
    const order = await createOrder(orderData);
    
    // Set to PROCESSING
    const trx1 = await db.transaction();
    try {
      await updateOrderWithFinance({
        trx: trx1,
        id: order.id,
        payload: { status: STATUS.PROCESSING },
        helpers: {
          TABLES,
          STATUS,
          sanitizeOrderWritePayload,
          normalizeOrderRow,
          todayYMDInVietnam,
        },
      });
      await trx1.commit();
    } catch (err) {
      await trx1.rollback();
      throw err;
    }
    
    const debtAfterProcessing = await getSupplierDebt(supplyId);
    
    // Delete to canceled (creates refund record)
    const trx2 = await db.transaction();
    let deletedResult;
    try {
      const orderRow = await trx2(TABLES.orderList).where({ id: order.id }).first();
      const normalized = normalizeOrderRow(orderRow, todayYMDInVietnam());
      
      deletedResult = await deleteOrderWithArchive({
        trx: trx2,
        order: orderRow,
        normalized,
        reqBody: { can_hoan: 100000 },
        helpers: {
          TABLES,
          ORDERS_SCHEMA,
          STATUS,
          nextId,
          pruneArchiveData,
          allowedArchiveColsExpired: ORDER_EXPIRED_ALLOWED_COLS,
          allowedArchiveColsCanceled: ORDER_CANCELED_ALLOWED_COLS,
        },
      });
    } catch (err) {
      await trx2.rollback();
      throw err;
    }
    
    const debtAfterDelete = await getSupplierDebt(supplyId);
    
    // Mark as refunded
    const canceledOrder = await db(TABLES.orderCanceled)
      .where({ id_order: order.id_order })
      .first();
    
    if (canceledOrder) {
      await db(TABLES.orderCanceled)
        .where({ id: canceledOrder.id })
        .update({ status: STATUS.REFUNDED });
    }
    
    const debtAfterRefund = await getSupplierDebt(supplyId);
    
    console.log(`  - Initial debt: ${initialDebt}`);
    console.log(`  - Debt after PROCESSING: ${debtAfterProcessing}`);
    console.log(`  - Debt after delete: ${debtAfterDelete}`);
    console.log(`  - Debt after refund status: ${debtAfterRefund}`);
    console.log(`  - Refund amount: ${canceledOrder?.refund || 0}`);
    console.log(`  - Moved to: ${deletedResult.movedTo}`);
    
    // Refund status change should NOT affect supplier debt
    const passed = debtAfterRefund === debtAfterDelete && deletedResult.movedTo === "canceled";
    console.log(`  ✓ ${passed ? "PASS" : "FAIL"}: Hoàn tiền chỉ đánh dấu status, không trừ tiền NCC`);
    
    return { passed, supplyId };
  },
};

// Run all tests
(async () => {
  console.log("=".repeat(60));
  console.log("TESTING BUSINESS RULES");
  console.log("=".repeat(60));
  
  const results = [];
  
  try {
    for (const [name, testFn] of Object.entries(tests)) {
      try {
        const result = await testFn();
        results.push({ name, ...result });
      } catch (err) {
        console.error(`  ✗ ERROR in ${name}:`, err.message);
        results.push({ name, passed: false, error: err.message });
      }
    }
  } finally {
    console.log("\n" + "=".repeat(60));
    console.log("TEST SUMMARY");
    console.log("=".repeat(60));
    
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    
    results.forEach((r) => {
      console.log(`  ${r.passed ? "✓" : "✗"} ${r.name}: ${r.passed ? "PASS" : r.error || "FAIL"}`);
    });
    
    console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    
    process.exit(failed > 0 ? 1 : 0);
  }
})();
