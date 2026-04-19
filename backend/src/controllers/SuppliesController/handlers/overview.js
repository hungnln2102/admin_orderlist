const { db } = require("../../../db");
const {
  QUOTED_COLS,
  TABLES,
  orderCols,
  STATUS,
} = require("../constants");
const {
  quoteIdent,
} = require("../../../utils/sql");
const { normalizeSupplyStatus } = require("../../../utils/normalizers");
const {
  resolveSupplyStatusColumn,
  parseSupplyId,
  resolveSupplierTableName,
  resolveSupplierNameColumn,
} = require("../helpers");
const logger = require("../../../utils/logger");
const { supplierHasAccountHolderColumn } = require("../../../utils/supplierAccountHolderColumn");

const getSupplyOverview = async (req, res) => {
  const { supplyId } = req.params;
  logger.debug(`[GET] /api/supplies/${supplyId}/overview`, { supplyId });

  const parsedSupplyId = parseSupplyId(supplyId);
  if (!parsedSupplyId) {
    return res.status(400).json({ error: "ID nhà cung cấp không hợp lệ." });
  }

  try {
    const client = db;
    const supplierTable = await resolveSupplierTableName();
    const supplierNameCol = await resolveSupplierNameColumn();
    const supplierNameIdent = quoteIdent(supplierNameCol);
    const statusColumnName = await resolveSupplyStatusColumn();
    const supplyStatusColumn = statusColumnName || null;

    const includeAccountHolder = await supplierHasAccountHolderColumn(client, supplierTable);
    const accountHolderSelect = includeAccountHolder
      ? `s.${QUOTED_COLS.supplier.accountHolder} AS account_holder`
      : `NULL::text AS account_holder`;

    const supplyRowResult = await client.raw(
      `
        SELECT
          s.${QUOTED_COLS.supplier.id} AS id,
          s.${supplierNameIdent} AS source_name,
          s.${QUOTED_COLS.supplier.numberBank} AS number_bank,
          s.${QUOTED_COLS.supplier.binBank} AS bin_bank,
          ${accountHolderSelect},
          ${supplyStatusColumn ? `s."${supplyStatusColumn}"` : QUOTED_COLS.supplier.activeSupply} AS raw_status,
          COALESCE(s.${QUOTED_COLS.supplier.activeSupply}, TRUE) AS active_supply
        FROM ${supplierTable} s
        WHERE s.${QUOTED_COLS.supplier.id} = ?
        LIMIT 1;
      `,
      [parsedSupplyId]
    );
    if (!supplyRowResult.rows?.length) {
      return res.status(404).json({
        error: "Không tìm thấy nguồn cung cấp.",
      });
    }
    const supplyRow = supplyRowResult.rows[0];
    const normalizedStatus = normalizeSupplyStatus(supplyRow.raw_status);

    const statusColumn = quoteIdent(orderCols.status);
    const idSupplyCol = quoteIdent(orderCols.idSupply);
    const ps = QUOTED_COLS.paymentSupply;
    const lc = QUOTED_COLS.supplierOrderCostLog;
    const paidNccLabel = "Đã Thanh Toán";
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE ${statusColumn} IS DISTINCT FROM '${STATUS.REFUNDED}' AND ${statusColumn} IS DISTINCT FROM '${STATUS.PENDING_REFUND}') AS total_orders,
        COUNT(*) FILTER (WHERE ${statusColumn} IN ('${STATUS.CANCELED}')) AS canceled_orders,
        COUNT(*) FILTER (WHERE ${statusColumn} = :unpaidStatus) AS unpaid_orders,
        COUNT(*) FILTER (WHERE ${statusColumn} IN ('${STATUS.PAID}')) AS paid_orders
      FROM ${TABLES.orderList}
      WHERE ${idSupplyCol} = :supplyId
    `;
    const monthlyLogOrdersSql = `
      WITH latest AS (
        SELECT DISTINCT ON (l.${lc.orderListId})
          l.${lc.orderListId} AS order_list_id,
          l.${lc.idOrder} AS id_order,
          l.${lc.importCost} AS import_cost,
          l.${lc.refundAmount} AS refund_amount,
          l.${lc.nccPaymentStatus} AS ncc_payment_status,
          l.${lc.loggedAt} AS logged_at
        FROM ${TABLES.supplyOrderCostLog} l
        WHERE l.${lc.supplyId} = :supplyId
        ORDER BY l.${lc.orderListId}, l.${lc.id} DESC
      )
      SELECT
        EXTRACT(MONTH FROM latest.logged_at)::int AS month_num,
        latest.order_list_id,
        latest.id_order,
        COALESCE(latest.import_cost, 0)::numeric AS import_cost,
        COALESCE(latest.refund_amount, 0)::numeric AS refund_amount,
        COALESCE(latest.ncc_payment_status, '') AS ncc_payment_status,
        latest.logged_at
      FROM latest
      WHERE latest.logged_at IS NOT NULL
      ORDER BY month_num ASC, latest.logged_at DESC;
    `;

    const orderUnpaidSql = `
      WITH latest AS (
        SELECT DISTINCT ON (l.${lc.orderListId})
          l.${lc.supplyId} AS supply_id,
          l.${lc.importCost} AS import_cost,
          l.${lc.refundAmount} AS refund_amount,
          l.${lc.nccPaymentStatus} AS ncc_payment_status
        FROM ${TABLES.supplyOrderCostLog} l
        WHERE l.${lc.supplyId} = :supplyId
        ORDER BY l.${lc.orderListId}, l.${lc.id} DESC
      )
      SELECT COALESCE(SUM(
        CASE
          WHEN TRIM(COALESCE(latest.ncc_payment_status::text, '')) = :paidNccLabel
          THEN 0::numeric
          ELSE COALESCE(latest.import_cost, 0)::numeric - COALESCE(latest.refund_amount, 0)::numeric
        END
      ), 0)::numeric AS total_unpaid_import
      FROM latest
    `;

    const paidSummarySql = `
      SELECT SUM(
        COALESCE(pl.${ps.paid}, 0)
      ) AS total_paid_cycles
      FROM ${TABLES.paymentSupply} pl
      WHERE pl.${ps.sourceId} = :supplyId
    `;

    const bindings = {
      unpaidStatus: STATUS.UNPAID,
      supplyName: supplyRow.source_name,
      supplyId: parsedSupplyId,
      paidNccLabel,
    };

    const [statsResult, monthlyLogsResult, orderUnpaidRes, paidSummary] = await Promise.all([
      client.raw(statsQuery, bindings),
      client.raw(monthlyLogOrdersSql, bindings),
      client.raw(orderUnpaidSql, bindings),
      client.raw(paidSummarySql, bindings),
    ]);

    const stats = statsResult.rows?.[0] || {};
    const totalOrders = Number(stats.total_orders) || 0;
    const canceledOrders = Number(stats.canceled_orders) || 0;
    const unpaidOrders = Number(stats.unpaid_orders) || 0;
    const paidOrders = Number(stats.paid_orders) || 0;
    const totalPaidAmount = Number(paidSummary.rows?.[0]?.total_paid_cycles) || 0;

    const monthlyLogOrdersMap = new Map();
    for (const row of monthlyLogsResult.rows || []) {
      const month = Number(row.month_num) || 0;
      if (month <= 0) continue;
      if (!monthlyLogOrdersMap.has(month)) {
        monthlyLogOrdersMap.set(month, []);
      }
      monthlyLogOrdersMap.get(month).push({
        orderListId: Number(row.order_list_id) || 0,
        idOrder: String(row.id_order || ""),
        importCost: Number(row.import_cost) || 0,
        refundAmount: Number(row.refund_amount) || 0,
        nccPaymentStatus: String(row.ncc_payment_status || ""),
        loggedAt: row.logged_at,
      });
    }
    const logOrdersByMonth = Array.from(monthlyLogOrdersMap.entries())
      .map(([month, orders]) => ({
        month: Number(month),
        orders,
      }))
      .sort((a, b) => a.month - b.month);

    const monthlyOrders = logOrdersByMonth.map((item) => ({
      month: item.month,
      orders: item.orders.length,
    }));

    const orderUnpaidImport = Number(orderUnpaidRes.rows?.[0]?.total_unpaid_import) || 0;
    const unpaidPayments = [];
    if (orderUnpaidImport !== 0) {
      unpaidPayments.push({
        id: 0,
        round: "Công nợ theo đơn (Chưa TT NCC)",
        totalImport: orderUnpaidImport,
        paid: 0,
        status: orderUnpaidImport < 0 ? "NCC hoàn tiền cho Shop" : "Chưa Thanh Toán NCC",
      });
    }

    res.json({
      supply: {
        id: supplyRow.id,
        sourceName: supplyRow.source_name || "",
        numberBank: supplyRow.number_bank || null,
        binBank: supplyRow.bin_bank || null,
        nameBank: supplyRow.account_holder || null,
        status: supplyRow.active_supply === false ? "inactive" : normalizedStatus,
        rawStatus: supplyRow.raw_status || null,
        isActive: supplyRow.active_supply === true,
      },
      stats: {
        totalOrders,
        canceledOrders,
        unpaidOrders,
        paidOrders,
        totalPaidAmount,
        monthlyOrders,
      },
      logOrdersByMonth,
      unpaidPayments,
    });
  } catch (error) {
    logger.error("Query failed (GET /api/supplies/:id/overview)", { supplyId, error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải thông tin nhà cung cấp.",
    });
  }
};

module.exports = { getSupplyOverview };

