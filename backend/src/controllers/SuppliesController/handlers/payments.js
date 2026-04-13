const { db } = require("../../../db");
const { QUOTED_COLS, TABLES, paymentLedgerCols, STATUS } = require("../constants");
const { parseMoney, parseSupplyId } = require("../helpers");
const logger = require("../../../utils/logger");

const createPayment = async (req, res) => {
  const { supplyId } = req.params;
  logger.info(`[POST] /api/supplies/${supplyId}/payments`, { body: req.body });

  const parsedSupplyId = parseSupplyId(supplyId);
  if (!parsedSupplyId) {
    return res.status(400).json({ error: "ID nhà cung cấp không hợp lệ." });
  }

  const roundLabel =
    typeof req.body?.round === "string" && req.body.round.trim()
      ? req.body.round.trim()
      : null;
  const statusLabel =
    typeof req.body?.status === "string" && req.body.status.trim()
      ? req.body.status.trim()
      : null;
  const totalImportRaw = Number(req.body?.totalImport);
  const paidRaw = Number(req.body?.paid);

  if (!roundLabel) {
    return res.status(400).json({ error: "Chu kỳ không hợp lệ." });
  }
  if (!Number.isFinite(totalImportRaw)) {
    return res.status(400).json({ error: "Tổng nhập không hợp lệ." });
  }
  if (!Number.isFinite(paidRaw)) {
    return res.status(400).json({ error: "Giá trị đã thanh toán không hợp lệ." });
  }
  if (!statusLabel) {
    return res.status(400).json({ error: "Trạng thái không hợp lệ." });
  }

  try {
    const result = await db(TABLES.paymentLedger)
      .insert({
        [paymentLedgerCols.SOURCE_ID]: parsedSupplyId,
        [paymentLedgerCols.AMOUNT]: totalImportRaw,
        [paymentLedgerCols.AMOUNT_PAID]: paidRaw,
        [paymentLedgerCols.ROUND]: roundLabel,
        [paymentLedgerCols.STATUS]: statusLabel,
        [paymentLedgerCols.NOTE]: null,
        [paymentLedgerCols.SOURCE]: "manual",
      })
      .returning([
        paymentLedgerCols.ID,
        paymentLedgerCols.SOURCE_ID,
        paymentLedgerCols.AMOUNT,
        paymentLedgerCols.AMOUNT_PAID,
        paymentLedgerCols.ROUND,
        paymentLedgerCols.STATUS,
      ]);
    if (!result?.length) {
      return res.status(500).json({
        error: "Không thể thêm chu kỳ thanh toán.",
      });
    }
    const row = result[0];
    res.status(201).json({
      id: row[paymentLedgerCols.ID],
      sourceId: row[paymentLedgerCols.SOURCE_ID],
      totalImport: Number(row[paymentLedgerCols.AMOUNT]) || 0,
      paid: Number(row[paymentLedgerCols.AMOUNT_PAID]) || 0,
      round: row[paymentLedgerCols.ROUND] || "",
      status: row[paymentLedgerCols.STATUS] || "",
    });
  } catch (error) {
    logger.error("Mutation failed (POST /api/supplies/:supplyId/payments)", { supplyId, error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể thêm chu kỳ thanh toán.",
    });
  }
};

const updatePaymentImport = async (req, res) => {
  const { supplyId, paymentId } = req.params;
  logger.debug("[PATCH] /api/supplies/:supplyId/payments/:paymentId", { supplyId, paymentId, body: req.body });

  const parsedSupplyId = parseSupplyId(supplyId);
  const parsedPaymentId = parseSupplyId(paymentId);
  if (!parsedSupplyId || !parsedPaymentId) {
    return res.status(400).json({
      error: "Mã cung cấp hoặc mã thanh toán không hợp lệ.",
    });
  }

  const nextTotalImport = parseMoney(req.body?.totalImport, null);
  if (nextTotalImport === null) {
    return res.status(400).json({
      error: "Giá trị tổng nhập không hợp lệ.",
    });
  }

  const lg = QUOTED_COLS.supplierPaymentLedger;

  try {
    const prevRes = await db.raw(
      `
      SELECT
        COALESCE(${lg.amount}, 0)::numeric AS prev_amount,
        COALESCE(${lg.status}, '') AS prev_status,
        COALESCE(${lg.round}, '') AS prev_round
      FROM ${TABLES.paymentLedger}
      WHERE ${lg.id} = ?
        AND ${lg.sourceId} = ?
      LIMIT 1;
    `,
      [parsedPaymentId, parsedSupplyId]
    );
    if (!prevRes.rows?.length) {
      return res.status(404).json({
        error: "Không tìm thấy chu kỳ thanh toán cho nhà cung cấp này.",
      });
    }
    const prevAmount = Number(prevRes.rows[0].prev_amount) || 0;
    const prevStatus = String(prevRes.rows[0].prev_status || STATUS.UNPAID).trim() || STATUS.UNPAID;
    const prevRound = String(prevRes.rows[0].prev_round || "").trim();
    const delta = nextTotalImport - prevAmount;

    const result = await db.raw(
      `
      INSERT INTO ${TABLES.paymentLedger} (
        ${lg.sourceId},
        ${lg.amount},
        ${lg.amountPaid},
        ${lg.round},
        ${lg.status},
        ${lg.note},
        ${lg.source}
      )
      VALUES (?, ?, 0, ?, ?, ?, 'manual_adjust')
      RETURNING
        ${lg.id} AS id,
        ${lg.sourceId} AS source_id,
        ${lg.amount} AS import_value,
        ${lg.amountPaid} AS paid_value,
        COALESCE(${lg.round}, '') AS round_label,
        COALESCE(${lg.status}, '') AS status_label;
    `,
      [
        parsedSupplyId,
        delta,
        prevRound,
        prevStatus,
        `Điều chỉnh tổng nhập ref#${parsedPaymentId} (${delta >= 0 ? "+" : ""}${delta})`,
      ]
    );

    const row = result.rows?.[0];
    if (!row) {
      return res.status(500).json({
        error: "Không thể ghi điều chỉnh.",
      });
    }

    res.json({
      id: row.id,
      sourceId: row.source_id,
      totalImport: Number(row.import_value) || 0,
      paid: Number(row.paid_value) || 0,
      round: row.round_label || "",
      status: row.status_label || "",
    });
  } catch (error) {
    logger.error("Mutation failed (PATCH /api/supplies/:supplyId/payments/:paymentId)", { supplyId, paymentId, error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Không thể cập nhật chu kỳ thanh toán.",
    });
  }
};

module.exports = {
  createPayment,
  updatePaymentImport,
};
