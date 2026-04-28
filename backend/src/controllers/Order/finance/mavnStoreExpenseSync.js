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

const expenseTable = tableName(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
const expenseCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;
const variantTable = tableName(PRODUCT_SCHEMA.VARIANT.TABLE, SCHEMA_PRODUCT);

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

/**
 * Đồng bộ dòng chi phí Form phân bổ với đơn MAVN.
 * Đặt/xóa/cập nhật bảng store_profit_expenses (expense_type = mavn_import).
 */
async function syncMavnStoreProfitExpense(trx, beforeRow, afterRow) {
  if (!afterRow) return;

  const idOrderCol = COLS.ORDER.ID_ORDER;
  const costCol = COLS.ORDER.COST;
  const productCol = COLS.ORDER.ID_PRODUCT;

  if (!isMavnImportOrder(afterRow)) return;

  const orderCode = String(afterRow[idOrderCol] ?? "").trim();
  if (!orderCode) return;

  const prevStatus = beforeRow?.status ?? "";
  const nextStatus = String(afterRow.status || "");

  if (nextStatus !== STATUS.PAID) {
    if (prevStatus === STATUS.PAID) {
      await trx(expenseTable)
        .where(expenseCols.EXPENSE_TYPE, "mavn_import")
        .where(expenseCols.LINKED_ORDER_CODE, orderCode)
        .del();
    }
    return;
  }

  const cost = normalizeMoney(afterRow[costCol] ?? afterRow.cost);
  if (!(cost > 0)) {
    await trx(expenseTable)
      .where(expenseCols.EXPENSE_TYPE, "mavn_import")
      .where(expenseCols.LINKED_ORDER_CODE, orderCode)
      .del();
    return;
  }

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
