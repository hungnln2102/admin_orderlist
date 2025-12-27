const { db } = require("../../../db");
const { QUOTED_COLS, TABLES } = require("../constants");
const { normalizeSupplyStatus } = require("../../../utils/normalizers");
const { resolveSupplyStatusColumn, parseSupplyId } = require("../helpers");

const createSupply = async (req, res) => {
  console.log("[POST] /api/supplies", req.body);
  const { source_name, number_bank, bin_bank, status, active_supply } =
    req.body || {};
  if (!source_name) {
    return res.status(400).json({ error: "Tên nhà cung cấp là bắt buộc." });
  }

  const statusColumn = await resolveSupplyStatusColumn();
  const fields = [
    QUOTED_COLS.supply.sourceName,
    QUOTED_COLS.supply.numberBank,
    QUOTED_COLS.supply.binBank,
  ];
  const values = [source_name, number_bank ?? null, bin_bank ?? null];

  if (statusColumn) {
    fields.push(`"${statusColumn}"`);
    values.push(status ?? active_supply ?? "active");
  } else {
    fields.push(QUOTED_COLS.supply.activeSupply);
    values.push(active_supply !== undefined ? !!active_supply : true);
  }

  const placeholders = values.map(() => "?");

  try {
    const result = await db.raw(
      `
      INSERT INTO ${TABLES.supply} (${fields.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING ${QUOTED_COLS.supply.id} AS id;
    `,
      values
    );
    const newId = result.rows?.[0]?.id;
    res.status(201).json({
      id: newId,
      source_name,
      number_bank: number_bank ?? null,
      bin_bank: bin_bank ?? null,
      status: status ?? active_supply ?? "active",
    });
  } catch (error) {
    console.error("Mutation failed (POST /api/supplies):", error);
    res.status(500).json({ error: "Không thể tạo nhà cung cấp." });
  }
};

const updateSupply = async (req, res) => {
  console.log("[PATCH] /api/supplies/:supplyId", req.params, req.body);
  const { supplyId } = req.params;
  const parsedSupplyId = Number.parseInt(supplyId, 10);
  if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
    return res.status(400).json({ error: "ID nhà cung cấp không hợp lệ." });
  }

  const {
    source_name,
    number_bank,
    bin_bank,
    status,
    active_supply,
    bank_name,
  } = req.body || {};
  if (
    source_name === undefined &&
    number_bank === undefined &&
    bin_bank === undefined &&
    status === undefined &&
    active_supply === undefined
  ) {
    return res.status(400).json({ error: "Không có trường nào để cập nhật" });
  }

  const statusColumn = await resolveSupplyStatusColumn();
  const fields = [];
  const values = [];

  const addField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (source_name !== undefined) {
    addField(QUOTED_COLS.supply.sourceName, source_name);
  }
  if (number_bank !== undefined) {
    addField(QUOTED_COLS.supply.numberBank, number_bank);
  }
  if (bin_bank !== undefined) {
    addField(QUOTED_COLS.supply.binBank, bin_bank);
  }
  if (status !== undefined || active_supply !== undefined) {
    if (statusColumn) {
      addField(`"${statusColumn}"`, status ?? active_supply ?? null);
    } else {
      addField(
        QUOTED_COLS.supply.activeSupply,
        active_supply !== undefined ? !!active_supply : status === "active"
      );
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "Không có trường nào để cập nhật" });
  }

  try {
    const result = await db.raw(
      `
      UPDATE ${TABLES.supply}
      SET ${fields.join(", ")}
      WHERE ${QUOTED_COLS.supply.id} = ?
      RETURNING
        ${QUOTED_COLS.supply.id} AS id,
        ${QUOTED_COLS.supply.sourceName} AS source_name,
        ${QUOTED_COLS.supply.numberBank} AS number_bank,
        ${QUOTED_COLS.supply.binBank} AS bin_bank,
        ${statusColumn ? `"${statusColumn}" AS raw_status` : `${QUOTED_COLS.supply.activeSupply} AS raw_status`}
    `,
      [...values, parsedSupplyId]
    );

    if (!result.rows?.length) {
      return res.status(404).json({ error: "Không tìm thấy nguồn cung cấp" });
    }
    const row = result.rows[0];
    const normalizedStatus = normalizeSupplyStatus(row.raw_status);
    res.json({
      id: row.id,
      source_name: row.source_name,
      number_bank: row.number_bank,
      bin_bank: row.bin_bank,
      status: normalizedStatus,
      bank_name: bank_name ?? null,
    });
  } catch (error) {
    console.error("Mutation failed (PATCH /api/supplies/:id):", error);
    res.status(500).json({ error: "Không thể cập nhật nhà cung cấp." });
  }
};

const toggleSupplyActive = async (req, res) => {
  const { supplyId } = req.params;
  console.log("[PATCH] /api/supplies/:supplyId/active", req.body);

  const parsedSupplyId = parseSupplyId(supplyId);
  if (!parsedSupplyId) {
    return res.status(400).json({ error: "ID nhà cung cấp không hợp lệ." });
  }

  const statusColumn = await resolveSupplyStatusColumn();
  const statusColumnName = statusColumn || QUOTED_COLS.supply.activeSupply;
  const statusValue =
    statusColumn === "status" ? req.body?.status : req.body?.active ?? req.body?.is_active;

  try {
    const result = await db.raw(
      `
      UPDATE ${TABLES.supply}
      SET "${statusColumnName}" = ?
      WHERE ${QUOTED_COLS.supply.id} = ?
      RETURNING ${QUOTED_COLS.supply.id} AS id, "${statusColumnName}" AS raw_status;
    `,
      [statusValue, parsedSupplyId]
    );

    if (!result.rows?.length) {
      return res.status(404).json({
        error: "Không tìm thấy nguồn cung cấp.",
      });
    }

    const normalizedStatus = normalizeSupplyStatus(result.rows[0].raw_status);
    res.json({
      id: parsedSupplyId,
      status: normalizedStatus,
      rawStatus: result.rows[0].raw_status,
      isActive: normalizedStatus !== "inactive",
    });
  } catch (error) {
    console.error("Mutation failed (PATCH /api/supplies/:id/active):", error);
    res.status(500).json({
      error: "Không thể cập nhật trạng thái nhà cung cấp.",
    });
  }
};

const deleteSupply = async (req, res) => {
  const { supplyId } = req.params;
  const parsedSupplyId = parseSupplyId(supplyId);
  if (!parsedSupplyId) {
    return res.status(400).json({ error: "ID nhà cung cấp không hợp lệ." });
  }
  try {
    const result = await db.raw(
      `DELETE FROM ${TABLES.supply} WHERE ${QUOTED_COLS.supply.id} = ?`,
      [parsedSupplyId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "Không tìm thấy nguồn cung cấp." });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(
      `Mutation failed (DELETE /api/supplies/${parsedSupplyId}):`,
      error
    );
    res.status(500).json({
      error: "Không thể xóa nhà cung cấp.",
    });
  }
};

module.exports = {
  createSupply,
  updateSupply,
  toggleSupplyActive,
  deleteSupply,
};
