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

    const supplyRowResult = await client.raw(
      `
        SELECT
          s.${QUOTED_COLS.supplier.id} AS id,
          s.${supplierNameIdent} AS source_name,
          s.${QUOTED_COLS.supplier.numberBank} AS number_bank,
          s.${QUOTED_COLS.supplier.binBank} AS bin_bank,
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
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE ${statusColumn} IS DISTINCT FROM '${STATUS.REFUNDED}' AND ${statusColumn} IS DISTINCT FROM '${STATUS.PENDING_REFUND}') AS total_orders,
        COUNT(*) FILTER (WHERE ${statusColumn} IN ('${STATUS.CANCELED}')) AS canceled_orders,
        COUNT(*) FILTER (WHERE ${statusColumn} = :unpaidStatus) AS unpaid_orders,
        COUNT(*) FILTER (WHERE ${statusColumn} IN ('${STATUS.PAID}')) AS paid_orders
      FROM ${TABLES.orderList}
      WHERE TRIM(${quoteIdent(orderCols.supply)}::text) = TRIM(:supplyName)
    `;
    const monthlyQuery = `
      SELECT
        EXTRACT(MONTH FROM ${createDateNormalization("order_date")}) AS month_num,
        COUNT(*) AS monthly_orders
      FROM ${TABLES.orderList}
      WHERE TRIM(supply::text) = TRIM(:supplyName)
      GROUP BY month_num
      ORDER BY month_num;
    `;

    const unpaidSummarySql = `
      SELECT SUM(COALESCE(ps.${QUOTED_COLS.paymentSupply.importValue}, 0) - COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, 0)) AS total_unpaid
      FROM ${TABLES.paymentSupply} ps
      WHERE ps.${QUOTED_COLS.paymentSupply.sourceId} = :supplyId
        AND ps.${QUOTED_COLS.paymentSupply.status} = :unpaidStatus
    `;

    const paidSummarySql = `
      SELECT SUM(
        CASE
          WHEN ps.${QUOTED_COLS.paymentSupply.status} <> :unpaidStatus
            THEN COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, ps.${QUOTED_COLS.paymentSupply.importValue}, 0)
          ELSE 0
        END
      ) AS total_paid_cycles
      FROM ${TABLES.paymentSupply} ps
      WHERE ps.${QUOTED_COLS.paymentSupply.sourceId} = :supplyId
    `;

    const unpaidQuery = `
      SELECT
        ps.${QUOTED_COLS.paymentSupply.id} AS id,
        ps.${QUOTED_COLS.paymentSupply.round} AS round,
        COALESCE(ps.${QUOTED_COLS.paymentSupply.importValue}, 0) AS import_value,
        COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, 0) AS paid_value,
        COALESCE(ps.${QUOTED_COLS.paymentSupply.status}, '') AS status_label
      FROM ${TABLES.paymentSupply} ps
      WHERE ps.${QUOTED_COLS.paymentSupply.sourceId} = :supplyId
        AND ps.${QUOTED_COLS.paymentSupply.status} = :unpaidStatus
      ORDER BY ps.${QUOTED_COLS.paymentSupply.id} DESC;
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

