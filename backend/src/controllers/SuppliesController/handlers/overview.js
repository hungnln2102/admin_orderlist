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

    const lg = QUOTED_COLS.supplierPaymentLedger;

    const unpaidSummarySql = `
      SELECT SUM(COALESCE(pl.${lg.amount}, 0) - COALESCE(pl.${lg.amountPaid}, 0)) AS total_unpaid
      FROM ${TABLES.paymentLedger} pl
      WHERE pl.${lg.sourceId} = :supplyId
        AND pl.${lg.status} = :unpaidStatus
    `;

    const paidSummarySql = `
      SELECT SUM(
        CASE
          WHEN pl.${lg.status} <> :unpaidStatus
            THEN COALESCE(pl.${lg.amountPaid}, pl.${lg.amount}, 0)
          ELSE 0
        END
      ) AS total_paid_cycles
      FROM ${TABLES.paymentLedger} pl
      WHERE pl.${lg.sourceId} = :supplyId
    `;

    const unpaidQuery = `
      SELECT
        pl.${lg.id} AS id,
        pl.${lg.round} AS round,
        COALESCE(pl.${lg.amount}, 0) AS import_value,
        COALESCE(pl.${lg.amountPaid}, 0) AS paid_value,
        COALESCE(pl.${lg.status}, '') AS status_label
      FROM ${TABLES.paymentLedger} pl
      WHERE pl.${lg.sourceId} = :supplyId
        AND pl.${lg.status} = :unpaidStatus
      ORDER BY pl.${lg.id} DESC;
    `;

    const bindings = {
      unpaidStatus: STATUS.UNPAID,
      supplyName: supplyRow.source_name,
      supplyId: parsedSupplyId,
    };

    const [statsResult, monthlyResult, unpaidSummary, paidSummary, unpaidResult] = await Promise.all([
      client.raw(statsQuery, bindings),
      client.raw(monthlyQuery, bindings),
      client.raw(unpaidSummarySql, bindings),
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

    const totalUnpaidAmount = Number(unpaidSummary.rows?.[0]?.total_unpaid) || 0;

    const unpaidPayments = (unpaidResult.rows || []).map((row) => ({
      id: row.id,
      round: row.round || "",
      totalImport: Number(row.import_value) || 0,
      paid: Number(row.paid_value) || 0,
      status: row.status_label || "",
    }));

    if ((!unpaidPayments || unpaidPayments.length === 0) && totalUnpaidAmount > 0) {
      unpaidPayments.push({
        id: 0,
        round: "Tiền nợ",
        totalImport: totalUnpaidAmount,
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

