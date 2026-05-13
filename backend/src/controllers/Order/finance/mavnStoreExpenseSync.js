const {
  FINANCE_SCHEMA,
  PARTNER_SCHEMA,
  PRODUCT_SCHEMA,
  SCHEMA_FINANCE,
  SCHEMA_PARTNER,
  SCHEMA_PRODUCT,
  tableName,
} = require("../../../config/dbSchema");
const { STATUS, COLS } = require("../constants");
const {
  isMavnImportOrder,
  isMavrykShopSupplierName,
} = require("../../../utils/orderHelpers");
const { normalizeRawToYMD } = require("../helpers/normalize");
const {
  mergeSummaryUpdates,
  monthKeyVietnamFromDbTimestamp,
} = require("./dashboardSummary");

const expenseTable = tableName(FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE, SCHEMA_FINANCE);
const expenseCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;
const variantTable = tableName(PRODUCT_SCHEMA.VARIANT.TABLE, SCHEMA_PRODUCT);
const supplierTable = tableName(PARTNER_SCHEMA.SUPPLIER.TABLE, SCHEMA_PARTNER);
const supplierCols = PARTNER_SCHEMA.SUPPLIER.COLS;
const supplierCostLogTable = tableName(
  PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE,
  SCHEMA_PARTNER
);
const supplierCostLogCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;
const { storeProfitExpensesHasMavnColumns } = require("./storeProfitExpensesHasMavnColumns");

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

async function resolveIsInternalSupplier(trx, row) {
  const supplyId = Number(row?.[COLS.ORDER.ID_SUPPLY] ?? row?.supply_id);
  if (!Number.isFinite(supplyId) || supplyId <= 0) return false;
  const supplier = await trx(supplierTable)
    .select(supplierCols.SUPPLIER_NAME)
    .where(supplierCols.ID, supplyId)
    .first();
  return isMavrykShopSupplierName(supplier?.[supplierCols.SUPPLIER_NAME]);
}

async function applyInternalMavnDashboardDelta({
  trx,
  beforeRow,
  afterRow,
  beforeAppliedAmount,
  afterAppliedAmount,
}) {
  const beforeAmount = normalizeMoney(beforeAppliedAmount);
  const afterAmount = normalizeMoney(afterAppliedAmount);
  if (!(beforeAmount > 0) && !(afterAmount > 0)) return;

  const beforeMonthKey =
    beforeAmount > 0 ? await monthKeyMavnDashboard(trx, beforeRow) : null;
  const afterMonthKey =
    afterAmount > 0 ? await monthKeyMavnDashboard(trx, afterRow) : null;

  if (beforeMonthKey && beforeMonthKey === afterMonthKey) {
    const net = beforeAmount - afterAmount;
    if (!net) return;
    await mergeSummaryUpdates(
      trx,
      beforeMonthKey,
      { total_profit: net, estimated_bank_balance: net },
      { context: "mavnStoreExpenseSync.internal.sameMonth" }
    );
    return;
  }

  if (beforeMonthKey && beforeAmount > 0) {
    await mergeSummaryUpdates(
      trx,
      beforeMonthKey,
      { total_profit: beforeAmount, estimated_bank_balance: beforeAmount },
      { context: "mavnStoreExpenseSync.internal.removeBefore" }
    );
  }

  if (afterMonthKey && afterAmount > 0) {
    await mergeSummaryUpdates(
      trx,
      afterMonthKey,
      { total_profit: -afterAmount, estimated_bank_balance: -afterAmount },
      { context: "mavnStoreExpenseSync.internal.applyAfter" }
    );
  }
}

async function applyExternalMavnProfitDelta({
  trx,
  beforeRow,
  afterRow,
  beforeAppliedAmount,
  afterAppliedAmount,
}) {
  const beforeAmount = normalizeMoney(beforeAppliedAmount);
  const afterAmount = normalizeMoney(afterAppliedAmount);
  if (!(beforeAmount > 0) && !(afterAmount > 0)) return;

  const beforeMonthKey =
    beforeAmount > 0 ? await monthKeyMavnDashboard(trx, beforeRow) : null;
  const afterMonthKey =
    afterAmount > 0 ? await monthKeyMavnDashboard(trx, afterRow) : null;

  if (beforeMonthKey && beforeMonthKey === afterMonthKey) {
    const net = beforeAmount - afterAmount;
    if (!net) return;
    await mergeSummaryUpdates(
      trx,
      beforeMonthKey,
      { total_profit: net },
      { context: "mavnStoreExpenseSync.external.sameMonth" }
    );
    return;
  }

  if (beforeMonthKey && beforeAmount > 0) {
    await mergeSummaryUpdates(
      trx,
      beforeMonthKey,
      { total_profit: beforeAmount },
      { context: "mavnStoreExpenseSync.external.removeBefore" }
    );
  }

  if (afterMonthKey && afterAmount > 0) {
    await mergeSummaryUpdates(
      trx,
      afterMonthKey,
      { total_profit: -afterAmount },
      { context: "mavnStoreExpenseSync.external.applyAfter" }
    );
  }
}

async function deleteAutoExpenseLogsByOrderCode(trx, orderCode) {
  if (!orderCode) return;
  await trx(expenseTable)
    .where(expenseCols.LINKED_ORDER_CODE, orderCode)
    .where((qb) => {
      qb.where(expenseCols.EXPENSE_TYPE, "mavn_import")
        .orWhere((nested) =>
          nested
            .where(expenseCols.EXPENSE_TYPE, "external_import")
            .whereRaw(
              `COALESCE(${expenseCols.EXPENSE_META}->>'flow', '') = ?`,
              ["mavn_order_internal"]
            )
        );
    })
    .del();
}

/**
 * Đồng bộ dòng chi phí Form phân bổ với đơn MAVN.
 * - NCC Mavryk/Shop: ghi external_import theo đơn, trừ profit + bank.
 * - NCC khác: dùng supplier_order_cost_log (DB trigger) để trừ profit, KHÔNG trừ bank.
 */
async function syncMavnStoreProfitExpense(trx, beforeRow, afterRow) {
  if (!afterRow) return;
  if (!(await storeProfitExpensesHasMavnColumns())) return;

  const idOrderCol = COLS.ORDER.ID_ORDER;
  const costCol = COLS.ORDER.COST;
  const priceCol = COLS.ORDER.PRICE;
  const productCol = COLS.ORDER.ID_PRODUCT;

  if (!isMavnImportOrder(afterRow)) return;

  const orderCode = String(afterRow[idOrderCol] ?? "").trim();
  if (!orderCode) return;

  const prevStatus = String(beforeRow?.status ?? "").trim();
  const nextStatus = String(afterRow.status || "").trim();

  const prevCost = normalizeMoney(beforeRow?.[costCol] ?? beforeRow?.cost);
  const nextCost = normalizeMoney(afterRow[costCol] ?? afterRow.cost);
  const prevPrice = normalizeMoney(beforeRow?.[priceCol] ?? beforeRow?.price);
  const nextPrice = normalizeMoney(afterRow[priceCol] ?? afterRow.price);
  const wasInternal = beforeRow ? await resolveIsInternalSupplier(trx, beforeRow) : false;
  const isInternal = await resolveIsInternalSupplier(trx, afterRow);
  const beforeAppliedAmount =
    prevStatus === STATUS.PAID && prevPrice > 0 && wasInternal ? prevPrice : 0;
  const afterAppliedAmount =
    nextStatus === STATUS.PAID && nextPrice > 0 && isInternal ? nextPrice : 0;

  await applyInternalMavnDashboardDelta({
    trx,
    beforeRow,
    afterRow,
    beforeAppliedAmount,
    afterAppliedAmount,
  });
  const beforeExternalAmount =
    prevStatus === STATUS.PAID && prevCost > 0 && !wasInternal ? prevCost : 0;
  const afterExternalAmount =
    nextStatus === STATUS.PAID && nextCost > 0 && !isInternal ? nextCost : 0;
  await applyExternalMavnProfitDelta({
    trx,
    beforeRow,
    afterRow,
    beforeAppliedAmount: beforeExternalAmount,
    afterAppliedAmount: afterExternalAmount,
  });

  if (!(afterAppliedAmount > 0)) {
    await deleteAutoExpenseLogsByOrderCode(trx, orderCode);
    return;
  }

  const variantId = afterRow[productCol] ?? afterRow.id_product;
  const productLabel = await fetchVariantDisplay(trx, variantId);
  const meta = {
    ...buildExpenseMeta(afterRow, productLabel),
    flow: "mavn_order_internal",
    source: "syncMavnStoreProfitExpense",
  };
  const reason = `Nhập hàng ngoài luồng (MAVN) — ${orderCode}`;

  const insertPayload = {
    [expenseCols.AMOUNT]: afterAppliedAmount,
    [expenseCols.REASON]: reason,
    [expenseCols.EXPENSE_TYPE]: "external_import",
    [expenseCols.LINKED_ORDER_CODE]: orderCode,
    [expenseCols.EXPENSE_META]: meta,
  };

  if (isInternal) {
    const orderListId = Number(afterRow?.[COLS.ORDER.ID] ?? afterRow?.id);
    if (Number.isFinite(orderListId) && orderListId > 0) {
      await trx(supplierCostLogTable)
        .where(supplierCostLogCols.ORDER_LIST_ID, orderListId)
        .del();
    }
  }

  await trx(expenseTable)
    .where(expenseCols.EXPENSE_TYPE, "mavn_import")
    .where(expenseCols.LINKED_ORDER_CODE, orderCode)
    .del();

  const existing = await trx(expenseTable)
    .select(expenseCols.ID)
    .where(expenseCols.EXPENSE_TYPE, "external_import")
    .where(expenseCols.LINKED_ORDER_CODE, orderCode)
    .whereRaw(
      `COALESCE(${expenseCols.EXPENSE_META}->>'flow', '') = ?`,
      ["mavn_order_internal"]
    )
    .first();

  if (existing?.id) {
    await trx(expenseTable)
      .where(expenseCols.ID, existing.id)
      .update({
        [expenseCols.AMOUNT]: afterAppliedAmount,
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
