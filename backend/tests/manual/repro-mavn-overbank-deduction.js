const { db } = require("../../src/db");
const {
  FINANCE_SCHEMA,
  ORDERS_SCHEMA,
  PARTNER_SCHEMA,
  PRODUCT_SCHEMA,
  SCHEMA_FINANCE,
  SCHEMA_ORDERS,
  SCHEMA_PARTNER,
  SCHEMA_PRODUCT,
  tableName,
} = require("../../src/config/dbSchema");
const { STATUS, COLS } = require("../../src/controllers/Order/constants");
const { nextId } = require("../../src/services/idService");
const {
  syncMavnStoreProfitExpense,
} = require("../../src/controllers/Order/finance/mavnStoreExpenseSync");
const {
  mergeSummaryUpdates,
} = require("../../src/controllers/Order/finance/dashboardSummary");

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const expenseTable = tableName(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
const expenseCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;

const orderTable = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const orderCols = ORDERS_SCHEMA.ORDER_LIST.COLS;

const supplierTable = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_PARTNER);
const supplierCols = PARTNER_SCHEMA.SUPPLIER.COLS;

const variantTable = tableName(PRODUCT_SCHEMA.VARIANT.TABLE, SCHEMA_PRODUCT);
const variantCols = PRODUCT_SCHEMA.VARIANT.COLS;

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

async function getMonthKey(trx) {
  const r = await trx.raw(
    "SELECT TO_CHAR(DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM') AS mk"
  );
  return String(r.rows?.[0]?.mk || "").trim();
}

async function getSummarySnapshot(trx, monthKey) {
  const row = await trx(summaryTable)
    .select(summaryCols.TOTAL_PROFIT, summaryCols.ESTIMATED_BANK_BALANCE)
    .where(summaryCols.MONTH_KEY, monthKey)
    .first();
  return {
    profit: toNum(row?.[summaryCols.TOTAL_PROFIT]),
    bank: toNum(row?.[summaryCols.ESTIMATED_BANK_BALANCE]),
  };
}

function buildOrderCode() {
  const suffix = Date.now().toString().slice(-8);
  return `MAVNREPRO${suffix}`;
}

async function pickInternalSupplier(trx) {
  return trx(supplierTable)
    .select(supplierCols.ID, supplierCols.SUPPLIER_NAME)
    .whereRaw(
      "LOWER(TRIM(COALESCE(??::text, ''))) IN ('mavryk', 'shop')",
      [supplierCols.SUPPLIER_NAME]
    )
    .orderBy(supplierCols.ID, "asc")
    .first();
}

async function pickVariantId(trx) {
  const row = await trx(variantTable)
    .select(variantCols.ID)
    .orderBy(variantCols.ID, "asc")
    .first();
  return Number(row?.[variantCols.ID] || 0);
}

async function run() {
  const trx = await db.transaction();
  try {
    const monthKey = await getMonthKey(trx);
    const supplier = await pickInternalSupplier(trx);
    const variantId = await pickVariantId(trx);
    if (!supplier?.[supplierCols.ID]) {
      throw new Error("Không có supplier nội bộ (mavryk/shop) để test.");
    }
    if (!variantId) {
      throw new Error("Không có variant để test.");
    }

    const price = 120000;
    const orderCode = buildOrderCode();
    const orderId = await nextId(orderTable, orderCols.ID, trx);
    const today = new Date();
    const expiry = new Date(today.getTime() + 30 * 86400000);

    const before = await getSummarySnapshot(trx, monthKey);

    await trx(orderTable).insert({
      [orderCols.ID]: orderId,
      [orderCols.ID_ORDER]: orderCode,
      [orderCols.ID_PRODUCT]: variantId,
      [orderCols.INFORMATION_ORDER]: `repro-${orderCode}`,
      [orderCols.CUSTOMER]: "repro",
      [orderCols.CONTACT]: "0900000000",
      [orderCols.SLOT]: "1",
      [orderCols.ORDER_DATE]: today,
      [orderCols.DAYS]: 30,
      [orderCols.EXPIRY_DATE]: expiry,
      [orderCols.ID_SUPPLY]: supplier[supplierCols.ID],
      [orderCols.COST]: price,
      [orderCols.PRICE]: price,
      [orderCols.NOTE]: "repro over bank deduction",
      [orderCols.STATUS]: STATUS.PAID,
    });

    const insertedOrder = await trx(orderTable)
      .where(orderCols.ID, orderId)
      .first();

    // B1: Luồng MAVN nội bộ tự động (đúng nghiệp vụ hiện tại): trừ profit + bank = price.
    await syncMavnStoreProfitExpense(trx, null, insertedOrder);

    // B2: Giả lập script thủ công tạo thêm 1 log nhập ngoài luồng cùng mã đơn.
    //     Đây là bước gây trừ bank lần 2.
    await trx(expenseTable).insert({
      [expenseCols.AMOUNT]: price,
      [expenseCols.REASON]: `Repro manual external_import - ${orderCode}`,
      [expenseCols.EXPENSE_TYPE]: "external_import",
      [expenseCols.LINKED_ORDER_CODE]: orderCode,
      [expenseCols.EXPENSE_META]: trx.raw("?::jsonb", [
        JSON.stringify({
          flow: "manual_external_import_repro",
          source: "repro-mavn-overbank-deduction",
        }),
      ]),
    });
    await mergeSummaryUpdates(
      trx,
      monthKey,
      { total_profit: -price, estimated_bank_balance: -price },
      { context: "repro.manual_external_import.double_deduct" }
    );

    const after = await getSummarySnapshot(trx, monthKey);
    const profitDelta = after.profit - before.profit;
    const bankDelta = after.bank - before.bank;

    console.log(
      JSON.stringify(
        {
          ok: true,
          rollback: true,
          monthKey,
          order: {
            orderId,
            orderCode,
            supplierId: supplier[supplierCols.ID],
            supplierName: supplier[supplierCols.SUPPLIER_NAME],
            price,
            status: STATUS.PAID,
          },
          deltas: {
            totalProfitDelta: profitDelta,
            estimatedBankBalanceDelta: bankDelta,
          },
          expectation: {
            expectedSingleDeductByPrice: -price,
            actualBankDelta: bankDelta,
            overDeductAmount: Math.abs(bankDelta) - price,
          },
          note: "Nếu overDeductAmount > 0 thì đã tái hiện lỗi trừ bank cao hơn giá bán.",
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error?.message || String(error),
          stack: error?.stack || null,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  } finally {
    await trx.rollback();
  }
}

run();
