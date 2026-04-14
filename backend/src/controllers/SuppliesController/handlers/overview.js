const { db } = require("../../../db");
const {
  QUOTED_COLS,
  TABLES,
  orderCols,
  STATUS,
} = require("../constants");
const {
  createDateNormalization,
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
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE ${statusColumn} IS DISTINCT FROM '${STATUS.REFUNDED}' AND ${statusColumn} IS DISTINCT FROM '${STATUS.PENDING_REFUND}') AS total_orders,
        COUNT(*) FILTER (WHERE ${statusColumn} IN ('${STATUS.CANCELED}')) AS canceled_orders,
        COUNT(*) FILTER (WHERE ${statusColumn} = :unpaidStatus) AS unpaid_orders,
        COUNT(*) FILTER (WHERE ${statusColumn} IN ('${STATUS.PAID}')) AS paid_orders
      FROM ${TABLES.orderList}
      WHERE ${idSupplyCol} = :supplyId
    `;
    const monthlyQuery = `
      SELECT
        EXTRACT(MONTH FROM ${createDateNormalization("order_date")}) AS month_num,
        COUNT(*) AS monthly_orders
      FROM ${TABLES.orderList}
      WHERE ${idSupplyCol} = :supplyId
      GROUP BY month_num
      ORDER BY month_num;
    `;

    const ps = QUOTED_COLS.paymentSupply;
    const lc = QUOTED_COLS.supplierOrderCostLog;
    const paidNccLabel = "Đã Thanh Toán";
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
        CASE
          WHEN pl.${ps.status} <> :unpaidStatus
            THEN COALESCE(pl.${ps.paid}, 0)
          ELSE 0
        END
      ) AS total_paid_cycles
      FROM ${TABLES.paymentSupply} pl
      WHERE pl.${ps.sourceId} = :supplyId
    `;

    const unpaidQuery = `
      SELECT
        pl.${ps.id} AS id,
        pl.${ps.round} AS round,
        0::numeric AS import_value,
        COALESCE(pl.${ps.paid}, 0) AS paid_value,
        COALESCE(pl.${ps.status}, '') AS status_label
      FROM ${TABLES.paymentSupply} pl
      WHERE pl.${ps.sourceId} = :supplyId
        AND pl.${ps.status} = :unpaidStatus
      ORDER BY pl.${ps.id} DESC;
    `;

    const bindings = {
      unpaidStatus: STATUS.UNPAID,
      supplyName: supplyRow.source_name,
      supplyId: parsedSupplyId,
      paidNccLabel,
    };

    const [statsResult, monthlyResult, orderUnpaidRes, paidSummary, unpaidResult] = await Promise.all([
      client.raw(statsQuery, bindings),
      client.raw(monthlyQuery, bindings),
      client.raw(orderUnpaidSql, bindings),
      client.raw(paidSummarySql, bindings),
      client.raw(unpaidQuery, bindings),
    ]);

    const stats = statsResult.rows?.[0] || {};
    const totalOrders = Number(stats.total_orders) || 0;
    const canceledOrders = Number(stats.canceled_orders) || 0;
    const unpaidOrders = Number(stats.unpaid_orders) || 0;
    const paidOrders = Number(stats.paid_orders) || 0;
    const totalPaidAmount = Number(paidSummary.rows?.[0]?.total_paid_cycles) || 0;

    const monthlyOrders =
      monthlyResult.rows?.map((row) => ({
        month: Number(row.month_num),
        orders: Number(row.monthly_orders) || 0,
      })) || [];

    const orderUnpaidImport = Number(orderUnpaidRes.rows?.[0]?.total_unpaid_import) || 0;

    const dbUnpaidRows = unpaidResult.rows || [];
    const unpaidPayments = dbUnpaidRows.map((row, idx) => ({
      id: row.id,
      round: row.round || "",
      totalImport:
        orderUnpaidImport > 0 && (dbUnpaidRows.length === 1 || idx === 0)
          ? orderUnpaidImport
          : Number(row.import_value) || 0,
      paid: Number(row.paid_value) || 0,
      status: row.status_label || "",
    }));

    if (dbUnpaidRows.length === 0 && orderUnpaidImport > 0) {
      unpaidPayments.push({
        id: 0,
        round: "Công nợ theo đơn (Chưa TT NCC)",
        totalImport: orderUnpaidImport,
        paid: 0,
        status: STATUS.UNPAID,
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

