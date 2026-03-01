const db = require("../../db/knexClient");
const {
  FORM_DESC_SCHEMA,
  getDefinition,
  tableName,
  SCHEMA_FORM_DESC,
  SCHEMA_INPUTS,
} = require("../../config/dbSchema");
const logger = require("../../utils/logger");

const FORM_NAME_DEF = getDefinition("FORM_NAME", FORM_DESC_SCHEMA);
const FORM_INPUT_DEF = getDefinition("FORM_INPUT", FORM_DESC_SCHEMA);
const INPUT_DEF = getDefinition("INPUTS", FORM_DESC_SCHEMA);

const FORM_NAME_TABLE = tableName(
  FORM_NAME_DEF?.tableName || "form_name",
  SCHEMA_FORM_DESC
);
const FORM_INPUT_TABLE = tableName(
  FORM_INPUT_DEF?.tableName || "form_input",
  SCHEMA_FORM_DESC
);
const INPUTS_TABLE = tableName(
  INPUT_DEF?.tableName || "inputs",
  SCHEMA_INPUTS
);

const listForms = async (_req, res) => {
  try {
    if (!FORM_NAME_DEF) {
      return res.status(500).json({
        error: "Thiếu cấu hình bảng form_name trong FORM_DESC_SCHEMA",
      });
    }

    const cols = FORM_NAME_DEF.columns;

    const rows = await db(FORM_NAME_TABLE)
      .select({
        id: cols.id,
        name: cols.name,
        description: cols.description,
        createdAt: cols.createdAt,
        updatedAt: cols.updatedAt,
      })
      .orderBy([
        { column: cols.createdAt, order: "desc" },
        { column: cols.id, order: "asc" },
      ]);

    res.json({ items: rows });
  } catch (error) {
    logger.error("[forms] Query failed (list)", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Không thể tải danh sách form.",
    });
  }
};

const getFormDetail = async (req, res) => {
  try {
    if (!FORM_NAME_DEF || !FORM_INPUT_DEF || !INPUT_DEF) {
      return res.status(500).json({
        error: "Thiếu cấu hình bảng form trong FORM_DESC_SCHEMA",
      });
    }

    const formId = Number(req.params.formId);
    if (!Number.isFinite(formId) || formId <= 0) {
      return res.status(400).json({
        error: "ID form không hợp lệ",
      });
    }

    const fCols = FORM_NAME_DEF.columns;
    const fiCols = FORM_INPUT_DEF.columns;
    const iCols = INPUT_DEF.columns;

    const rows = await db(FORM_NAME_TABLE)
      .leftJoin(
        FORM_INPUT_TABLE,
        `${FORM_NAME_TABLE}.${fCols.id}`,
        `${FORM_INPUT_TABLE}.${fiCols.formId}`
      )
      .leftJoin(
        INPUTS_TABLE,
        `${FORM_INPUT_TABLE}.${fiCols.inputId}`,
        `${INPUTS_TABLE}.${iCols.id}`
      )
      .select({
        id: `${FORM_NAME_TABLE}.${fCols.id}`,
        name: `${FORM_NAME_TABLE}.${fCols.name}`,
        description: `${FORM_NAME_TABLE}.${fCols.description}`,
        inputId: `${INPUTS_TABLE}.${iCols.id}`,
        inputName: `${INPUTS_TABLE}.${iCols.inputName}`,
        inputType: `${INPUTS_TABLE}.${iCols.inputType}`,
        sortOrder: `${FORM_INPUT_TABLE}.${fiCols.sortOrder}`,
      })
      .where(`${FORM_NAME_TABLE}.${fCols.id}`, formId)
      .orderBy([
        { column: `${FORM_INPUT_TABLE}.${fiCols.sortOrder}`, order: "asc" },
        { column: `${INPUTS_TABLE}.${iCols.inputName}`, order: "asc" },
      ]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        error: "Không tìm thấy form",
      });
    }

    const formRow = rows[0];
    const inputs = rows
      .filter((row) => row.inputId !== null && row.inputId !== undefined)
      .map((row) => ({
        id: row.inputId,
        name: row.inputName,
        type: row.inputType,
        sortOrder: row.sortOrder,
      }));

    res.json({
      id: formRow.id,
      name: formRow.name,
      description: formRow.description,
      inputs,
    });
  } catch (error) {
    logger.error("[forms] Query failed (detail)", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Không thể tải chi tiết form.",
    });
  }
};

const listInputs = async (_req, res) => {
  try {
    if (!INPUT_DEF) {
      return res.status(500).json({
        error: "Thiếu cấu hình bảng inputs trong FORM_DESC_SCHEMA",
      });
    }

    const cols = INPUT_DEF.columns;

    const rows = await db(INPUTS_TABLE)
      .select({
        id: cols.id,
        name: cols.inputName,
        type: cols.inputType,
        createdAt: cols.createdAt,
      })
      .orderBy([
        { column: cols.createdAt, order: "desc" },
        { column: cols.id, order: "asc" },
      ]);

    res.json({ items: rows });
  } catch (error) {
    logger.error("[forms] Query failed (listInputs)", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Không thể tải danh sách input.",
    });
  }
};

const createInput = async (req, res) => {
  try {
    if (!INPUT_DEF) {
      return res.status(500).json({
        error: "Thiếu cấu hình bảng inputs trong FORM_DESC_SCHEMA",
      });
    }

    const { name, type } = req.body || {};
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedType = typeof type === "string" ? type.trim().toLowerCase() : "text";

    if (!trimmedName) {
      return res.status(400).json({
        error: "Tên input không được để trống",
      });
    }

    const cols = INPUT_DEF.columns;

    const [inserted] = await db(INPUTS_TABLE)
      .insert({
        [cols.inputName]: trimmedName,
        [cols.inputType]: trimmedType || "text",
      })
      .returning("*");

    const row = inserted || {};
    res.status(201).json({
      id: row[cols.id] ?? row.id,
      name: row[cols.inputName] ?? row.input_name ?? trimmedName,
      type: row[cols.inputType] ?? row.input_type ?? trimmedType,
      createdAt: row[cols.createdAt] ?? row.created_at ?? null,
    });
  } catch (error) {
    logger.error("[forms] Query failed (createInput)", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Không thể tạo input.",
    });
  }
};

const createForm = async (req, res) => {
  try {
    if (!FORM_NAME_DEF || !FORM_INPUT_DEF) {
      return res.status(500).json({
        error: "Thiếu cấu hình bảng form trong FORM_DESC_SCHEMA",
      });
    }

    const { name, description, inputIds } = req.body || {};
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedDesc = typeof description === "string" ? description.trim() : "";
    const ids = Array.isArray(inputIds)
      ? inputIds
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];

    if (!trimmedName) {
      return res.status(400).json({
        error: "Tên form không được để trống",
      });
    }

    const fCols = FORM_NAME_DEF.columns;
    const fiCols = FORM_INPUT_DEF.columns;

    const [inserted] = await db(FORM_NAME_TABLE)
      .insert({
        [fCols.name]: trimmedName,
        [fCols.description]: trimmedDesc || null,
      })
      .returning("*");

    const formRow = inserted || {};
    const formId = formRow[fCols.id] ?? formRow.id;
    if (!formId) {
      return res.status(500).json({
        error: "Không thể tạo form",
      });
    }

    if (ids.length > 0) {
      const rows = ids.map((inputId, idx) => ({
        [fiCols.formId]: formId,
        [fiCols.inputId]: inputId,
        [fiCols.sortOrder]: idx,
      }));
      await db(FORM_INPUT_TABLE).insert(rows);
    }

    res.status(201).json({
      id: formId,
      name: formRow[fCols.name] ?? formRow.name ?? trimmedName,
      description: formRow[fCols.description] ?? formRow.description ?? (trimmedDesc || null),
      inputIds: ids,
      createdAt: formRow[fCols.createdAt] ?? formRow.created_at ?? null,
    });
  } catch (error) {
    logger.error("[forms] Query failed (createForm)", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Không thể tạo form.",
    });
  }
};

module.exports = {
  listForms,
  getFormDetail,
  listInputs,
  createInput,
  createForm,
};

