const { db } = require("../../../db");
const { QUOTED_COLS, TABLES } = require("../constants");
const { normalizeSupplyStatus } = require("../../../utils/normalizers");
const {
  resolveSupplyStatusColumn,
  parseSupplyId,
  resolveSupplierTableName,
  resolveSupplierNameColumn,
} = require("../helpers");
const logger = require("../../../utils/logger");

const createSupply = async (req, res) => {
  logger.debug("[POST] /api/supplies", { body: req.body });
  const body = req.body || {};
  const source_name = body.supplier_name ?? body.source_name;
  const { number_bank, bin_bank, status, active_supply } = body;
  if (!source_name) {
    return res.status(400).json({ error: "Tên nhà cung cấp là bắt buộc." });
  }

  const supplierTable = await resolveSupplierTableName();
  const supplierNameCol = await resolveSupplierNameColumn();
  const supplierNameIdent = `"${supplierNameCol}"`;
  const statusColumn = await resolveSupplyStatusColumn();
  const fields = [
    supplierNameIdent,
    QUOTED_COLS.supplier.numberBank,
    QUOTED_COLS.supplier.binBank,
  ];
  const values = [source_name, number_bank ?? null, bin_bank ?? null];

  if (statusColumn) {
    fields.push(`"${statusColumn}"`);
    values.push(status ?? active_supply ?? "active");
  } else {
    fields.push(QUOTED_COLS.supplier.activeSupply);
    values.push(active_supply !== undefined ? !!active_supply : true);
  }

  const placeholders = values.map(() => "?");

  try {
    const result = await db.raw(
      `
      INSERT INTO ${supplierTable} (${fields.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING ${QUOTED_COLS.supplier.id} AS id;
    `,
      values
    );
    const newId = result.rows?.[0]?.id;
    res.status(201).json({
      id: newId,
      supplier_name: source_name,
      source_name,
      number_bank: number_bank ?? null,
      bin_bank: bin_bank ?? null,
      status: status ?? active_supply ?? "active",
    });
  } catch (error) {
    logger.error("Mutation failed (POST /api/supplies)", { error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể tạo nhà cung cấp." });
  }
};

const updateSupply = async (req, res) => {
  logger.debug("[PATCH] /api/supplies/:supplyId", { params: req.params, body: req.body });
  const { supplyId } = req.params;
  const parsedSupplyId = Number.parseInt(supplyId, 10);
  if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
    return res.status(400).json({ error: "ID nhà cung cấp không hợp lệ." });
  }

  const {
    supplier_name: supplierNameRaw,
    source_name,
    number_bank,
    bin_bank,
    status,
    active_supply,
    bank_name,
  } = req.body || {};
  const resolvedName = supplierNameRaw ?? source_name;
  if (
    resolvedName === undefined &&
    number_bank === undefined &&
    bin_bank === undefined &&
    status === undefined &&
    active_supply === undefined
  ) {
    return res.status(400).json({ error: "Không có trường nào để cập nhật" });
  }

  const supplierTable = await resolveSupplierTableName();
  const supplierNameCol = await resolveSupplierNameColumn();
  const supplierNameIdent = `"${supplierNameCol}"`;
  const statusColumn = await resolveSupplyStatusColumn();
  const fields = [];
  const values = [];

  const addField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (resolvedName !== undefined) {
    addField(supplierNameIdent, resolvedName);
  }
  if (number_bank !== undefined) {
    addField(QUOTED_COLS.supplier.numberBank, number_bank);
  }
  if (bin_bank !== undefined) {
    addField(QUOTED_COLS.supplier.binBank, bin_bank);
  }
  if (status !== undefined || active_supply !== undefined) {
    if (statusColumn) {
      addField(`"${statusColumn}"`, status ?? active_supply ?? null);
    } else {
      addField(
        QUOTED_COLS.supplier.activeSupply,
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
      UPDATE ${supplierTable}
      SET ${fields.join(", ")}
      WHERE ${QUOTED_COLS.supplier.id} = ?
      RETURNING
        ${QUOTED_COLS.supplier.id} AS id,
        ${supplierNameIdent} AS source_name,
        ${QUOTED_COLS.supplier.numberBank} AS number_bank,
        ${QUOTED_COLS.supplier.binBank} AS bin_bank,
        ${statusColumn ? `"${statusColumn}" AS raw_status` : `${QUOTED_COLS.supplier.activeSupply} AS raw_status`}
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
      supplier_name: row.source_name,
      source_name: row.source_name,
      number_bank: row.number_bank,
      bin_bank: row.bin_bank,
      status: normalizedStatus,
      bank_name: bank_name ?? null,
    });
  } catch (error) {
    logger.error("Mutation failed (PATCH /api/supplies/:id)", { supplyId, error: error.message, stack: error.stack });
    res.status(500).json({ error: "Không thể cập nhật nhà cung cấp." });
  }
};

const toggleSupplyActive = async (req, res) => {
  const { supplyId } = req.params;
  logger.debug("[PATCH] /api/supplies/:supplyId/active", { supplyId, body: req.body });

  const parsedSupplyId = parseSupplyId(supplyId);
  if (!parsedSupplyId) {
    return res.status(400).json({ error: "ID nhà cung cấp không hợp lệ." });
  }

  const statusColumn = await resolveSupplyStatusColumn();
  const statusColumnName = statusColumn || QUOTED_COLS.supplier.activeSupply;
  const statusValue =
    statusColumn === "status" ? req.body?.status : req.body?.active ?? req.body?.is_active;

  try {
    const result = await db.raw(
      `
      UPDATE ${TABLES.supply}
      SET "${statusColumnName}" = ?
      WHERE ${QUOTED_COLS.supplier.id} = ?
      RETURNING ${QUOTED_COLS.supplier.id} AS id, "${statusColumnName}" AS raw_status;
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
    logger.error("Mutation failed (PATCH /api/supplies/:id/active)", { supplyId, error: error.message, stack: error.stack });
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
      `DELETE FROM ${TABLES.supply} WHERE ${QUOTED_COLS.supplier.id} = ?`,
      [parsedSupplyId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "Không tìm thấy nguồn cung cấp." });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error("Mutation failed (DELETE /api/supplies/:id)", { supplyId: parsedSupplyId, error: error.message, stack: error.stack });
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

