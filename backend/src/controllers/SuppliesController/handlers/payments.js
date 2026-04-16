const { db } = require("../../../db");
const { QUOTED_COLS, TABLES, paymentSupplyCols } = require("../constants");
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
  const totalImportEffective = Number.isFinite(totalImportRaw) ? totalImportRaw : 0;
  const paidRaw = Number(req.body?.paid);

  if (!roundLabel) {
    return res.status(400).json({ error: "Chu kỳ không hợp lệ." });
  }
  if (!Number.isFinite(paidRaw)) {
    return res.status(400).json({ error: "Giá trị đã thanh toán không hợp lệ." });
  }
  if (!statusLabel) {
    return res.status(400).json({ error: "Trạng thái không hợp lệ." });
  }

  try {
    const existing = await db(TABLES.paymentSupply)
      .select(paymentSupplyCols.ID)
      .where(paymentSupplyCols.SOURCE_ID, parsedSupplyId)
      .first();

    if (existing) {
      const updated = await db(TABLES.paymentSupply)
        .where(paymentSupplyCols.ID, existing[paymentSupplyCols.ID])
        .update({
          [paymentSupplyCols.PAID]: paidRaw,
          [paymentSupplyCols.ROUND]: roundLabel,
          [paymentSupplyCols.STATUS]: statusLabel,
        })
        .returning([
          paymentSupplyCols.ID,
          paymentSupplyCols.SOURCE_ID,
          paymentSupplyCols.PAID,
          paymentSupplyCols.ROUND,
          paymentSupplyCols.STATUS,
        ]);
      const row = updated?.[0];
      if (!row) {
        return res.status(500).json({ error: "Không thể cập nhật chu kỳ thanh toán." });
      }
      return res.status(200).json({
        id: row[paymentSupplyCols.ID],
        sourceId: row[paymentSupplyCols.SOURCE_ID],
        totalImport: totalImportEffective,
        paid: Number(row[paymentSupplyCols.PAID]) || 0,
        round: row[paymentSupplyCols.ROUND] || "",
        status: row[paymentSupplyCols.STATUS] || "",
      });
    }

    const result = await db(TABLES.paymentSupply)
      .insert({
        [paymentSupplyCols.SOURCE_ID]: parsedSupplyId,
        [paymentSupplyCols.PAID]: paidRaw,
        [paymentSupplyCols.ROUND]: roundLabel,
        [paymentSupplyCols.STATUS]: statusLabel,
      })
      .returning([
        paymentSupplyCols.ID,
        paymentSupplyCols.SOURCE_ID,
        paymentSupplyCols.PAID,
        paymentSupplyCols.ROUND,
        paymentSupplyCols.STATUS,
      ]);
    if (!result?.length) {
      return res.status(500).json({
        error: "Không thể thêm chu kỳ thanh toán.",
      });
    }
    const row = result[0];
    res.status(201).json({
      id: row[paymentSupplyCols.ID],
      sourceId: row[paymentSupplyCols.SOURCE_ID],
      totalImport: totalImportEffective,
      paid: Number(row[paymentSupplyCols.PAID]) || 0,
      round: row[paymentSupplyCols.ROUND] || "",
      status: row[paymentSupplyCols.STATUS] || "",
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

  const ps = QUOTED_COLS.paymentSupply;

  try {
    const prevRes = await db.raw(
      `
      SELECT
        COALESCE(${ps.paid}, 0)::numeric AS prev_amount,
        COALESCE(${ps.status}, '') AS prev_status,
        COALESCE(${ps.round}, '') AS prev_round
      FROM ${TABLES.paymentSupply}
      WHERE ${ps.id} = ?
        AND ${ps.sourceId} = ?
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
    const prevRound = String(prevRes.rows[0].prev_round || "").trim();
    const delta = nextTotalImport - prevAmount;
    const nextPaid = Math.round(prevAmount + delta);

    const result = await db.raw(
      `
      UPDATE ${TABLES.paymentSupply}
      SET
        ${ps.paid} = ?,
        ${ps.round} = ?
      WHERE ${ps.id} = ?
        AND ${ps.sourceId} = ?
      RETURNING
        ${ps.id} AS id,
        ${ps.sourceId} AS source_id,
        ${ps.paid} AS import_value,
        ${ps.paid} AS paid_value,
        COALESCE(${ps.round}, '') AS round_label,
        COALESCE(${ps.status}, '') AS status_label;
    `,
      [
        nextPaid,
        `${prevRound} — Điều chỉnh ref#${parsedPaymentId} (${delta >= 0 ? "+" : ""}${delta})`,
        parsedPaymentId,
        parsedSupplyId,
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
