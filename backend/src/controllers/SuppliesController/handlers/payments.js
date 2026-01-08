const { db } = require("../../../db");
const { QUOTED_COLS, TABLES, paymentSupplyCols } = require("../constants");
const { parseMoney, parseSupplyId } = require("../helpers");

const createPayment = async (req, res) => {
  const { supplyId } = req.params;
  console.log(`[POST] /api/supplies/${supplyId}/payments`, req.body);

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
    const result = await db(TABLES.paymentSupply)
      .insert({
        [paymentSupplyCols.SOURCE_ID]: parsedSupplyId,
        [paymentSupplyCols.IMPORT_VALUE]: totalImportRaw,
        [paymentSupplyCols.PAID]: paidRaw,
        [paymentSupplyCols.ROUND]: roundLabel,
        [paymentSupplyCols.STATUS]: statusLabel,
      })
      .returning([
        paymentSupplyCols.ID,
        paymentSupplyCols.SOURCE_ID,
        paymentSupplyCols.IMPORT_VALUE,
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
      totalImport: Number(row[paymentSupplyCols.IMPORT_VALUE]) || 0,
      paid: Number(row[paymentSupplyCols.PAID]) || 0,
      round: row[paymentSupplyCols.ROUND] || "",
      status: row[paymentSupplyCols.STATUS] || "",
    });
  } catch (error) {
    console.error(
      `Mutation failed (POST /api/supplies/${supplyId}/payments):`,
      error
    );
    res.status(500).json({
      error: "Không thể thêm chu kỳ thanh toán.",
    });
  }
};

const updatePaymentImport = async (req, res) => {
  const { supplyId, paymentId } = req.params;
  console.log(
    `[PATCH] /api/supplies/${supplyId}/payments/${paymentId}`,
    req.body
  );

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

  try {
    const updateQuery = `
      UPDATE ${TABLES.paymentSupply}
      SET ${QUOTED_COLS.paymentSupply.importValue} = ?
      WHERE ${QUOTED_COLS.paymentSupply.id} = ?
        AND ${QUOTED_COLS.paymentSupply.sourceId} = ?
      RETURNING
        ${QUOTED_COLS.paymentSupply.id} AS id,
        ${QUOTED_COLS.paymentSupply.sourceId} AS source_id,
        COALESCE(${QUOTED_COLS.paymentSupply.importValue}, 0) AS import_value,
        COALESCE(${QUOTED_COLS.paymentSupply.paid}, 0) AS paid_value,
        COALESCE(${QUOTED_COLS.paymentSupply.round}, '') AS round_label,
        COALESCE(${QUOTED_COLS.paymentSupply.status}, '') AS status_label;
    `;

    const result = await db.raw(updateQuery, [
      nextTotalImport,
      parsedPaymentId,
      parsedSupplyId,
    ]);

    if (!result.rows?.length) {
      return res.status(404).json({
        error: "Không tìm thấy chu kỳ thanh toán cho nhà cung cấp này.",
      });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      sourceId: row.source_id,
      totalImport: Number(row.import_value) || 0,
      paid: Number(row.paid_value) || 0,
      round: row.round_label || "",
      status: row.status_label || "",
    });
  } catch (error) {
    console.error(
      `Mutation failed (PATCH /api/supplies/${supplyId}/payments/${paymentId}):`,
      error
    );
    res.status(500).json({
      error: "Không thể cập nhật chu kỳ thanh toán.",
    });
  }
};

module.exports = {
  createPayment,
  updatePaymentImport,
};
