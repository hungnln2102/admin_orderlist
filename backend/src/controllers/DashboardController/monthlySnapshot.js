/**
 * Doanh thu: cột total_revenue trên dashboard_monthly_summary (cộng dồn khi chèn biên lai, xem trigger).
 * Rebuild: revenueSource = 'receipts' tổng từ payment_receipt (sau khi xóa bảng, đối soát lại).
 * Hoàn/đếm đơn từ CTE order_list. total_import: SUM **một dòng log mới nhất / đơn / tháng** (`sumImportCostByMonthKeys`);
 * total_profit MAVN (âm cost) từ trigger NCC; nhập ngoài luồng điều chỉnh `total_profit` khi ghi `store_profit_expenses.external_import`.
 * Hiển thị API: dùng `total_profit` như trong DB. Thuế trên (doanh thu ròng).
 */
const { db } = require("../../db");
const { buildDashboardSummaryAggregateQuery } = require("./dashboardSummaryAggregate");
const { orderListHasCreatedAtColumn } = require("./orderListHasCreatedAtColumn");
const { quoteIdent } = require("../../utils/sql");
const { dashboardMonthlyTaxRatePercent } = require("../../config/appConfig");
const {
  tableName,
  FINANCE_SCHEMA,
  SCHEMA_FINANCE,
  ORDERS_SCHEMA,
  RECEIPT_SCHEMA,
  PARTNER_SCHEMA,
  SCHEMA_PARTNER,
  SCHEMA_ORDERS,
  SCHEMA_RECEIPT,
} = require("../../config/dbSchema");

const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const importLogTable = tableName(
  PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.TABLE,
  SCHEMA_PARTNER
);
const importLogCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;
const orderListTable = tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS);
const orderListCols = ORDERS_SCHEMA.ORDER_LIST.COLS;
const paymentReceiptTable = tableName(
  RECEIPT_SCHEMA.PAYMENT_RECEIPT.TABLE,
  SCHEMA_RECEIPT
);
const paymentReceiptCols = RECEIPT_SCHEMA.PAYMENT_RECEIPT.COLS;
const summaryTableName = tableName(
  FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE,
  SCHEMA_FINANCE
);

const toNumber = (value) => Number(value || 0);

/** Khớp `fn_recalc_dashboard_total_import` (bucket tháng Asia/Ho_Chi_Minh). */
const importLoggedAtMonthKeySql = (alias, loggedAtIdent) =>
  `to_char(timezone('Asia/Ho_Chi_Minh', ${alias}.${loggedAtIdent}), 'YYYY-MM')`;

const taxOnNet = (sepay, refund) =>
  Math.round(
    (toNumber(sepay) - toNumber(refund)) *
      (Number(dashboardMonthlyTaxRatePercent) / 100)
  );

const sumPaymentReceiptsByMonthKeys = async (monthKeys, executor = db) => {
  const unique = [...new Set((monthKeys || []).map((k) => String(k || "").trim()))].filter(
    Boolean
  );
  if (!unique.length) return new Map();
  const cPaid = quoteIdent(paymentReceiptCols.PAID_DATE);
  const cAmt = quoteIdent(paymentReceiptCols.AMOUNT);
  const placeholders = unique.map(() => "?").join(", ");
  const r = await executor.raw(
    `
    SELECT
      TO_CHAR(DATE_TRUNC('month', pr.${cPaid}::date), 'YYYY-MM') AS month_key,
      COALESCE(SUM(pr.${cAmt}::numeric), 0) AS sepay_sum
    FROM ${paymentReceiptTable} pr
    WHERE pr.${cPaid} IS NOT NULL
      AND TO_CHAR(DATE_TRUNC('month', pr.${cPaid}::date), 'YYYY-MM') IN (${placeholders})
    GROUP BY 1
    `,
    unique
  );
  return new Map(
    (r.rows || []).map((row) => [String(row.month_key || ""), toNumber(row.sepay_sum)])
  );
};

const sumImportCostByMonthKeys = async (monthKeys, executor = db) => {
  const unique = [...new Set((monthKeys || []).map((k) => String(k || "").trim()))].filter(
    Boolean
  );
  if (!unique.length) return new Map();
  const la = quoteIdent(importLogCols.LOGGED_AT);
  const ic = quoteIdent(importLogCols.IMPORT_COST);
  const oid = quoteIdent(importLogCols.ORDER_LIST_ID);
  const iid = quoteIdent(importLogCols.ID);
  const placeholders = unique.map(() => "?").join(", ");
  const r = await executor.raw(
    `
    SELECT
      mk,
      COALESCE(SUM(import_cost_num::numeric), 0) AS total_import
    FROM (
      SELECT
        ${importLoggedAtMonthKeySql("d", la)} AS mk,
        d.${ic} AS import_cost_num,
        ROW_NUMBER() OVER (
          PARTITION BY ${importLoggedAtMonthKeySql("d", la)}, d.${oid}
          ORDER BY d.${iid} DESC
        ) AS rn
      FROM ${importLogTable} d
      WHERE d.${la} IS NOT NULL
        AND ${importLoggedAtMonthKeySql("d", la)} IN (${placeholders})
    ) ranked
    WHERE ranked.rn = 1
    GROUP BY mk
    `,
    unique
  );
  return new Map(
    (r.rows || []).map((r0) => [String(r0.mk || ""), toNumber(r0.total_import)])
  );
};

/**
 * Tổng lãi theo từng dòng tháng (mỗi order_list_id một bản ghi log mới nhất): COALESCE(gross, price) - cost.
 */
const sumNccOrderMarginByMonthKeys = async (monthKeys, executor = db) => {
  const unique = [...new Set((monthKeys || []).map((k) => String(k || "").trim()))].filter(
    Boolean
  );
  if (!unique.length) return new Map();
  const la = quoteIdent(importLogCols.LOGGED_AT);
  const lid = quoteIdent(importLogCols.ORDER_LIST_ID);
  const lId = quoteIdent(importLogCols.ID);
  const olId = quoteIdent(orderListCols.ID);
  const gsp = quoteIdent(orderListCols.GROSS_SELLING_PRICE);
  const price = quoteIdent(orderListCols.PRICE);
  const cost = quoteIdent(orderListCols.COST);
  const placeholders = unique.map(() => "?").join(", ");
  const r = await executor.raw(
    `
    SELECT
      sub.mk,
      COALESCE(SUM(sub.m), 0) AS ncc_margin
    FROM (
      SELECT DISTINCT ON (
        ${importLoggedAtMonthKeySql("l", la)},
        l.${lid}
      )
        ${importLoggedAtMonthKeySql("l", la)} AS mk,
        GREATEST(
          0,
          COALESCE(ol.${gsp}::numeric, ol.${price}::numeric, 0) - COALESCE(ol.${cost}::numeric, 0)
        ) AS m
      FROM ${importLogTable} l
      INNER JOIN ${orderListTable} ol ON ol.${olId} = l.${lid}
      WHERE l.${la} IS NOT NULL
        AND ${importLoggedAtMonthKeySql("l", la)} IN (${placeholders})
      ORDER BY
        ${importLoggedAtMonthKeySql("l", la)},
        l.${lid},
        l.${lId} DESC
    ) sub
    GROUP BY sub.mk
    `,
    unique
  );
  return new Map(
    (r.rows || []).map((r0) => [String(r0.mk || ""), toNumber(r0.ncc_margin)])
  );
};

const sumRevenueAndImportFromSummaryTable = async (monthKeys, executor = db) => {
  const unique = [...new Set((monthKeys || []).map((k) => String(k || "").trim()))].filter(
    Boolean
  );
  if (!unique.length) return new Map();
  const stored = await executor(summaryTableName)
    .select(
      summaryCols.MONTH_KEY,
      summaryCols.TOTAL_REVENUE,
      summaryCols.TOTAL_IMPORT,
      summaryCols.TOTAL_PROFIT,
      summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT
    )
    .whereIn(summaryCols.MONTH_KEY, unique);
  return new Map(
    (stored || []).map((r) => [
      String(r[summaryCols.MONTH_KEY] || ""),
      {
        revenue: toNumber(r[summaryCols.TOTAL_REVENUE]),
        importVal: toNumber(r[summaryCols.TOTAL_IMPORT]),
        /** Tổng lãi dòng từ trigger NCC, trước rút lợi nhuận. */
        margin: toNumber(r[summaryCols.TOTAL_PROFIT]),
        offFlowBankReceipt: toNumber(r[summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT]),
      },
    ])
  );
};

/**
 * @param {import("knex").Knex|import("knex").Transaction} [executor]
 * @param {{ revenueSource?: 'table' | 'receipts' }} [options] — rebuild sau TRUNC: 'receipts' (tổng từ biên lai);
 *   mặc định 'table' (đọc cột cộng dồn từ trigger).
 */
const buildAlignedMonthlyRows = async (executor = db, options = {}) => {
  const revenueSource = options.revenueSource === "receipts" ? "receipts" : "table";
  const useCreatedAt = await orderListHasCreatedAtColumn();
  const result = await executor.raw(
    buildDashboardSummaryAggregateQuery(summaryCols, { useCreatedAt })
  );
  const rows = result.rows || [];
  if (rows.length === 0) return [];

  const mks = rows
    .map((row) => String(row[summaryCols.MONTH_KEY] || "").trim())
    .filter(Boolean);

  const tbl = await sumRevenueAndImportFromSummaryTable(mks, executor);

  let revImpByMonth;
  if (revenueSource === "receipts") {
    const [revMap, impMap, nccMap] = await Promise.all([
      sumPaymentReceiptsByMonthKeys(mks, executor),
      sumImportCostByMonthKeys(mks, executor),
      sumNccOrderMarginByMonthKeys(mks, executor),
    ]);
    revImpByMonth = (mk) => ({
      rev: revMap.get(mk) || 0,
      imp: impMap.get(mk) || 0,
      nccMargin: nccMap.get(mk) || 0,
      offFlow: (tbl.get(mk)?.offFlowBankReceipt ?? 0) || 0,
    });
  } else {
    revImpByMonth = (mk) => {
      const t = tbl.get(mk);
      return {
        rev: t ? t.revenue : 0,
        imp: t ? t.importVal : 0,
        nccMargin: t ? t.margin : 0,
        offFlow: t ? t.offFlowBankReceipt || 0 : 0,
      };
    };
  }

  return rows.map((row) => {
    const mk = String(row[summaryCols.MONTH_KEY] || "");
    const { rev, imp: importVal, nccMargin, offFlow } = revImpByMonth(mk);
    const refund = toNumber(row[summaryCols.TOTAL_REFUND]);
    const profitForDisplay = nccMargin;
    return {
      [summaryCols.MONTH_KEY]: mk,
      [summaryCols.TOTAL_ORDERS]: toNumber(row[summaryCols.TOTAL_ORDERS]),
      [summaryCols.CANCELED_ORDERS]: toNumber(row[summaryCols.CANCELED_ORDERS]),
      [summaryCols.TOTAL_REVENUE]: rev,
      [summaryCols.TOTAL_PROFIT]: profitForDisplay,
      [summaryCols.TOTAL_REFUND]: refund,
      [summaryCols.TOTAL_IMPORT]: importVal,
      [summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT]: offFlow,
      [summaryCols.TOTAL_TAX]: taxOnNet(rev, refund),
    };
  });
};

/**
 * Các trường trả về cho API (camel/snake ổn định) — một hàng từ buildAlignedMonthlyRows.
 */
const rowToApiShape = (dbRow) => {
  const mk = String(dbRow[summaryCols.MONTH_KEY] || "");
  const sepay = toNumber(dbRow[summaryCols.TOTAL_REVENUE]);
  const refund = toNumber(dbRow[summaryCols.TOTAL_REFUND]);
  return {
    month_key: mk,
    total_orders: toNumber(dbRow[summaryCols.TOTAL_ORDERS]),
    canceled_orders: toNumber(dbRow[summaryCols.CANCELED_ORDERS]),
    total_revenue: sepay,
    total_profit: toNumber(dbRow[summaryCols.TOTAL_PROFIT]),
    total_refund: refund,
    total_import: toNumber(dbRow[summaryCols.TOTAL_IMPORT]),
    total_tax: toNumber(dbRow[summaryCols.TOTAL_TAX]),
    total_off_flow_bank_receipt: toNumber(dbRow[summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT]),
  };
};

module.exports = {
  buildAlignedMonthlyRows,
  sumPaymentReceiptsByMonthKeys,
  sumImportCostByMonthKeys,
  sumNccOrderMarginByMonthKeys,
  sumRevenueAndImportFromSummaryTable,
  rowToApiShape,
  toNumber,
  taxOnNet,
};
