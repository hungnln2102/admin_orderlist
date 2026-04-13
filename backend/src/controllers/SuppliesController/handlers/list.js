const { db } = require("../../../db");
const { PARTNER_SCHEMA } = require("../../../config/dbSchema");
const { QUOTED_COLS, TABLES, variantCols, supplyPriceCols, orderCols, supplyCols } = require("../constants");
const { quoteIdent, createNumericExtraction } = require("../../../utils/sql");

const logCols = PARTNER_SCHEMA.SUPPLIER_ORDER_COST_LOG.COLS;
const { parseSupplyId, resolveSupplierTableName, resolveSupplierNameColumn } = require("../helpers");
const logger = require("../../../utils/logger");
const { supplierCache } = require("../../../utils/cache");
const { supplierHasAccountHolderColumn } = require("../../../utils/supplierAccountHolderColumn");

const listSupplies = async (_req, res) => {
  try {
    const rows = await supplierCache.getOrSet("all", async () => {
      const supplierTable = await resolveSupplierTableName();
      const supplierNameCol = await resolveSupplierNameColumn();
      const includeAccountHolder = await supplierHasAccountHolderColumn(db, supplierTable);
      const baseSelect = {
        id: "id",
        source_name: supplierNameCol,
        number_bank: "number_bank",
        bin_bank: "bin_bank",
      };
      if (includeAccountHolder) {
        baseSelect.account_holder = "account_holder";
      }
      return db(supplierTable)
        .select(baseSelect)
        .orderBy(supplierNameCol, "asc");
    });
    res.json(rows || []);
  } catch (error) {
    logger.error("Query failed (GET /api/supplies)", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải danh sách nhà cung cấp." });
  }
};

const getProductsBySupply = async (req, res) => {
  const { supplyId } = req.params;
  logger.debug(`[GET] /api/supplies/${supplyId}/products`, { supplyId });

  try {
    // Use Knex query builder with table aliases for better maintainability
    // Using raw SQL for column references to ensure correct schema resolution
    const rows = await db(TABLES.supplyPrice)
      .distinct()
      .select(
        db.raw(`${TABLES.variant}.${variantCols.id} as id`),
        db.raw(`${TABLES.variant}.${variantCols.displayName} as san_pham`)
      )
      .join(TABLES.variant, `${TABLES.supplyPrice}.${supplyPriceCols.variantId}`, "=", db.raw(`${TABLES.variant}.${variantCols.id}`))
      .where(`${TABLES.supplyPrice}.${supplyPriceCols.supplierId}`, supplyId)
      .orderBy(db.raw(`${TABLES.variant}.${variantCols.displayName}`), "asc");
    
    res.json(rows || []);
  } catch (error) {
    logger.error("Query failed (GET /api/supplies/:id/products)", { supplyId, error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải sản phẩm cho nhà cung cấp này.",
    });
  }
};

const listPaymentsBySupply = async (req, res) => {
  const { supplyId } = req.params;
  logger.debug(`[GET] /api/supplies/${supplyId}/payments`, { supplyId, query: req.query });

  const parsedSupplyId = parseSupplyId(supplyId);
  if (!parsedSupplyId) {
    return res.status(400).json({ error: "ID nhà cung cấp không hợp lệ." });
  }

  const limitParam = Number.parseInt(req.query.limit, 10);
  const offsetParam = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 50)
    : 5;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
  const limitPlusOne = limit + 1;
  const supplierTable = await resolveSupplierTableName();
  const supplierNameCol = await resolveSupplierNameColumn();
  const supplierNameIdent = quoteIdent(supplierNameCol);
  const lg = QUOTED_COLS.supplierPaymentLedger;
  const q = `
    SELECT
      pl.${lg.id} AS id,
      pl.${lg.sourceId} AS source_id,
      COALESCE(s.${supplierNameIdent}, '') AS source_name,
      ${createNumericExtraction(`pl.${lg.amount}`)} AS import_value,
      ${createNumericExtraction(`pl.${lg.amountPaid}`)} AS paid_value,
      COALESCE(pl.${lg.round}, '') AS round_label,
      COALESCE(pl.${lg.status}, '') AS status_label
    FROM ${TABLES.paymentLedger} pl
    LEFT JOIN ${supplierTable} s ON s.${quoteIdent("id")} = pl.${lg.sourceId}
    WHERE pl.${lg.sourceId} = ?
    ORDER BY pl.${lg.id} DESC
    OFFSET ?
    LIMIT ?;
  `;

  try {
    const result = await db.raw(q, [parsedSupplyId, offset, limitPlusOne]);
    const rows = result.rows || [];
    const hasMore = rows.length > limit;
    const payments = rows.slice(0, limit).map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name,
      totalImport: Number(row.import_value) || 0,
      paid: Number(row.paid_value) || 0,
      round: row.round_label || "",
      status: row.status_label || "",
    }));

    res.json({
      payments,
      hasMore,
      nextOffset: offset + payments.length,
    });
  } catch (error) {
    logger.error("Query failed (GET /api/supplies/:id/payments)", { supplyId, error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể tải lịch sử thanh toán cho nhà cung cấp này.",
    });
  }
};

/**
 * Chi tiết chi phí NCC theo đơn — partner.supplier_order_cost_log (nhiều dòng/đơn: vào ĐXL, gia hạn, đóng đơn). Tổng hợp: dòng mới nhất theo id.
 * GET /api/supplies/order-costs?limit=&offset=&supply_id=&q=
 */
const listSupplyOrderCosts = async (req, res) => {
  logger.debug("[GET] /api/supplies/order-costs", { query: req.query });

  const limitParam = Number.parseInt(String(req.query.limit ?? ""), 10);
  const offsetParam = Number.parseInt(String(req.query.offset ?? ""), 10);
  const supplyIdRaw = req.query.supply_id;
  const supplyIdFilter =
    supplyIdRaw !== undefined && supplyIdRaw !== null && String(supplyIdRaw).trim() !== ""
      ? Number.parseInt(String(supplyIdRaw), 10)
      : null;
  const search = req.query.q != null ? String(req.query.q).trim() : "";

  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 80, 1), 200);
  const offset = Math.max(Number.isFinite(offsetParam) ? offsetParam : 0, 0);

  if (supplyIdFilter !== null && !Number.isFinite(supplyIdFilter)) {
    return res.status(400).json({ error: "supply_id không hợp lệ." });
  }

  const lt = "l";
  const sj = "s";
  const supplyIdCol = quoteIdent(logCols.SUPPLY_ID);
  const idOrderCol = quoteIdent(logCols.ID_ORDER);
  const orderListIdCol = quoteIdent(logCols.ORDER_LIST_ID);
  const logIdCol = quoteIdent(logCols.ID);
  const importCostCol = quoteIdent(logCols.IMPORT_COST);
  const refundAmountCol = quoteIdent(logCols.REFUND_AMOUNT);
  const nccPaymentStatusCol = quoteIdent(logCols.NCC_PAYMENT_STATUS);
  const loggedAtCol = quoteIdent(logCols.LOGGED_AT);

  const whereParts = [];
  const bindings = [];
  if (supplyIdFilter !== null) {
    whereParts.push(`${lt}.${supplyIdCol} = ?`);
    bindings.push(supplyIdFilter);
  }
  if (search) {
    whereParts.push(`POSITION(LOWER(?) IN LOWER(CAST(${lt}.${idOrderCol} AS TEXT))) > 0`);
    bindings.push(search);
  }
  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  try {
    const supplierTable = await resolveSupplierTableName();
    const supplierNameColResolved = await resolveSupplierNameColumn();
    const supplierNameIdent = quoteIdent(supplierNameColResolved);
    const supIdCol = quoteIdent(supplyCols.id);

    const countSql = `
      SELECT COUNT(*)::bigint AS c
      FROM ${TABLES.supplyOrderCostLog} ${lt}
      ${whereSql}
    `;
    const countResult = await db.raw(countSql, bindings);
    const total = Number(countResult.rows?.[0]?.c) || 0;

    const aggSql = `
      WITH filtered AS (
        SELECT ${lt}.*
        FROM ${TABLES.supplyOrderCostLog} ${lt}
        ${whereSql}
      ),
      latest AS (
        SELECT DISTINCT ON (${lt}.${orderListIdCol})
          ${lt}.*
        FROM filtered ${lt}
        ORDER BY ${lt}.${orderListIdCol}, ${lt}.${logIdCol} DESC
      )
      SELECT
        COUNT(*)::bigint AS order_count,
        COALESCE(SUM(COALESCE(import_cost, 0)::numeric), 0) AS total_cost,
        COALESCE(SUM(COALESCE(refund_amount, 0)::numeric), 0) AS total_refund
      FROM latest
    `;
    const aggResult = await db.raw(aggSql, bindings);
    const aggRow = aggResult.rows?.[0] || {};
    const aggregates = {
      orderCount: Number(aggRow.order_count) || 0,
      totalCost: Number(aggRow.total_cost) || 0,
      totalRefund: Number(aggRow.total_refund) || 0,
    };

    const dataSql = `
      SELECT
        ${lt}.${orderListIdCol} AS order_pk,
        ${lt}.${idOrderCol} AS id_order,
        COALESCE(${sj}.${supplierNameIdent}, '') AS supplier_name,
        COALESCE(${lt}.${importCostCol}, 0)::numeric AS cost_value,
        COALESCE(${lt}.${refundAmountCol}, 0)::numeric AS refund_value,
        COALESCE(${lt}.${nccPaymentStatusCol}, '') AS ncc_payment_status,
        ${lt}.${loggedAtCol} AS order_date,
        ${lt}.${loggedAtCol} AS canceled_at
      FROM ${TABLES.supplyOrderCostLog} ${lt}
      INNER JOIN ${supplierTable} ${sj} ON ${sj}.${supIdCol} = ${lt}.${supplyIdCol}
      ${whereSql}
      ORDER BY ${lt}.${logIdCol} DESC
      OFFSET ?
      LIMIT ?
    `;
    const dataResult = await db.raw(dataSql, [...bindings, offset, limit]);
    const rows = (dataResult.rows || []).map((row) => ({
      orderPk: Number(row.order_pk) || 0,
      idOrder: row.id_order != null ? String(row.id_order) : "",
      supplierName: row.supplier_name != null ? String(row.supplier_name) : "",
      cost: Number(row.cost_value) || 0,
      refund: Number(row.refund_value) || 0,
      nccPaymentStatus:
        row.ncc_payment_status != null ? String(row.ncc_payment_status) : "Chưa Thanh Toán",
      orderDate: row.order_date,
      canceledAt: row.canceled_at,
    }));

    res.json({
      rows,
      total,
      limit,
      offset,
      aggregates,
    });
  } catch (error) {
    logger.error("Query failed (GET /api/supplies/order-costs)", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tải danh sách chi phí NCC theo đơn." });
  }
};

module.exports = {
  listSupplies,
  getProductsBySupply,
  listPaymentsBySupply,
  listSupplyOrderCosts,
};
