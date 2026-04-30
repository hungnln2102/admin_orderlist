const {
  FINANCE_SCHEMA,
  PRODUCT_SCHEMA,
  SCHEMA_FINANCE,
  SCHEMA_PRODUCT,
  tableName,
} = require("../../../config/dbSchema");
const { STATUS, COLS } = require("../constants");
const { isMavnImportOrder } = require("../../../utils/orderHelpers");
const { normalizeRawToYMD } = require("../helpers/normalize");
const {
  mergeSummaryUpdates,
  monthKeyVietnamFromDbTimestamp,
} = require("./dashboardSummary");

const expenseTable = tableName(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
const expenseCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;
const variantTable = tableName(PRODUCT_SCHEMA.VARIANT.TABLE, SCHEMA_PRODUCT);
const hasMavnExpenseColumns = Boolean(
  expenseCols.LINKED_ORDER_CODE && expenseCols.EXPENSE_META
);

const normalizeMoney = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

async function fetchVariantDisplay(trx, variantId) {
  if (variantId == null || !Number.isFinite(Number(variantId))) return "";
  const row = await trx(variantTable)
    .select(
      PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME,
      PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME
    )
    .where(PRODUCT_SCHEMA.VARIANT.COLS.ID, Number(variantId))
    .first();
  const name =
    row?.[PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME] ??
    row?.[PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME];
  return name != null ? String(name).trim() : "";
}

function buildExpenseMeta(row, productLabel) {
  const days = Number(row[COLS.ORDER.DAYS] ?? row.days ?? 0);
  const termDays = Number.isFinite(days) && days > 0 ? days : 0;
  const startYmd =
    normalizeRawToYMD(row[COLS.ORDER.ORDER_DATE] ?? row.order_date) || "";
  return {
    productLabel: productLabel || "",
    termDays,
    termLabel: termDays > 0 ? `${termDays} ngày` : "",
    startDate: startYmd,
  };
}

async function monthKeyMavnDashboard(trx, row) {
  const raw =
    row?.[COLS.ORDER.ORDER_DATE] ??
    row?.order_date ??
    row?.[COLS.ORDER.CREATED_AT] ??
    row?.created_at;
  return monthKeyVietnamFromDbTimestamp(trx, raw);
}

async function applyMavnDashboardProfitDelta(trx, rowForMonth, profitDelta) {
  const d = normalizeMoney(profitDelta);
  if (!d) return;
  const mk = await monthKeyMavnDashboard(trx, rowForMonth);
  if (!mk) return;
  await mergeSummaryUpdates(trx, mk, { total_profit: d });
}

/**
 * Đồng bộ dòng chi phí Form phân bổ với đơn MAVN.
 * Đặt/xóa/cập nhật bảng store_profit_expenses (expense_type = mavn_import).
 */
async function syncMavnStoreProfitExpense(trx, beforeRow, afterRow) {
  if (!afterRow) return;
  if (!hasMavnExpenseColumns) return;

  const idOrderCol = COLS.ORDER.ID_ORDER;
  const costCol = COLS.ORDER.COST;
  const productCol = COLS.ORDER.ID_PRODUCT;

  if (!isMavnImportOrder(afterRow)) return;

  const orderCode = String(afterRow[idOrderCol] ?? "").trim();
  if (!orderCode) return;

  const prevStatus = String(beforeRow?.status ?? "").trim();
  const nextStatus = String(afterRow.status || "").trim();

  const prevCost = normalizeMoney(beforeRow?.[costCol] ?? beforeRow?.cost);
  const nextCost = normalizeMoney(afterRow[costCol] ?? afterRow.cost);

  if (nextStatus !== STATUS.PAID) {
    if (prevStatus === STATUS.PAID && prevCost > 0) {
      await applyMavnDashboardProfitDelta(trx, beforeRow, prevCost);
    }
    await trx(expenseTable)
      .where(expenseCols.EXPENSE_TYPE, "mavn_import")
      .where(expenseCols.LINKED_ORDER_CODE, orderCode)
      .del();
    return;
  }

  if (!(nextCost > 0)) {
    if (prevStatus === STATUS.PAID && prevCost > 0) {
      await applyMavnDashboardProfitDelta(trx, beforeRow, prevCost);
    }
    await trx(expenseTable)
      .where(expenseCols.EXPENSE_TYPE, "mavn_import")
      .where(expenseCols.LINKED_ORDER_CODE, orderCode)
      .del();
    return;
  }

  if (prevStatus === STATUS.PAID) {
    await applyMavnDashboardProfitDelta(trx, afterRow, prevCost - nextCost);
  } else {
    await applyMavnDashboardProfitDelta(trx, afterRow, -nextCost);
  }

  const cost = nextCost;

  const variantId = afterRow[productCol] ?? afterRow.id_product;
  const productLabel = await fetchVariantDisplay(trx, variantId);
  const meta = buildExpenseMeta(afterRow, productLabel);
  const reason = `Nhập hàng MAVN — ${orderCode}`;

  const insertPayload = {
    [expenseCols.AMOUNT]: cost,
    [expenseCols.REASON]: reason,
    [expenseCols.EXPENSE_TYPE]: "mavn_import",
    [expenseCols.LINKED_ORDER_CODE]: orderCode,
    [expenseCols.EXPENSE_META]: meta,
  };

  const existing = await trx(expenseTable)
    .select(expenseCols.ID)
    .where(expenseCols.EXPENSE_TYPE, "mavn_import")
    .where(expenseCols.LINKED_ORDER_CODE, orderCode)
    .first();

  if (existing?.id) {
    await trx(expenseTable)
      .where(expenseCols.ID, existing.id)
      .update({
        [expenseCols.AMOUNT]: cost,
        [expenseCols.REASON]: reason,
        [expenseCols.EXPENSE_META]: meta,
      });
  } else {
    await trx(expenseTable).insert(insertPayload);
  }
}

module.exports = {
  syncMavnStoreProfitExpense,
};
