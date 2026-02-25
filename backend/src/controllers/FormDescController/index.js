const db = require("../../db/knexClient");
const {
  FORM_DESC_SCHEMA,
  getDefinition,
  tableName,
  SCHEMA_FORM_DESC,
} = require("../../config/dbSchema");
const logger = require("../../utils/logger");

const FORM_NAME_DEF = getDefinition("FORM_NAME", FORM_DESC_SCHEMA);

const FORM_NAME_TABLE = tableName(
  FORM_NAME_DEF?.tableName || "form_name",
  SCHEMA_FORM_DESC
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

module.exports = {
  listForms,
};

