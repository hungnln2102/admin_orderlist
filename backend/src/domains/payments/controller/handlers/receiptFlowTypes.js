const { db } = require("@/db");
const logger = require("@/utils/logger");
const { TABLES, FLOW_TYPE_COLS } = require("../shared/constants");

/**
 * GET /api/payments/receipt-flow-types
 * Lấy danh sách các loại phân loại dòng tiền đang kích hoạt
 */
const listReceiptFlowTypes = async (req, res) => {
  try {
    const list = await db(TABLES.receiptFlowTypes)
      .select({
        id: FLOW_TYPE_COLS.ID,
        code: FLOW_TYPE_COLS.CODE,
        label: FLOW_TYPE_COLS.LABEL,
        direction: FLOW_TYPE_COLS.DIRECTION,
        effect: FLOW_TYPE_COLS.EFFECT,
        isSystem: FLOW_TYPE_COLS.IS_SYSTEM,
        isActive: FLOW_TYPE_COLS.IS_ACTIVE,
        sortOrder: FLOW_TYPE_COLS.SORT_ORDER,
      })
      .where(FLOW_TYPE_COLS.IS_ACTIVE, true)
      .orderBy(FLOW_TYPE_COLS.SORT_ORDER, "asc");

    return res.json({ success: true, list });
  } catch (error) {
    logger.error("[payments] listReceiptFlowTypes failed", { error: error.message });
    return res.status(500).json({ error: "Không thể tải danh sách loại phân loại." });
  }
};

/**
 * POST /api/payments/receipt-flow-types
 * Tạo mới một loại phân loại (chỉ Admin)
 */
const createReceiptFlowType = async (req, res) => {
  const { code, label, direction, effect, sortOrder } = req.body;

  if (!code || !label || !direction || !effect) {
    return res.status(400).json({ error: "Vui lòng nhập đủ các thông tin bắt buộc." });
  }

  if (!["in", "out", "neutral"].includes(direction)) {
    return res.status(400).json({ error: "Hướng dòng tiền không hợp lệ." });
  }

  if (!["order_match", "off_flow_revenue", "withdrawal", "import_order", "ignore"].includes(effect)) {
    return res.status(400).json({ error: "Hành vi tài chính (effect) không hợp lệ." });
  }

  try {
    const codeSlug = String(code).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // Kiểm tra trùng code
    const existing = await db(TABLES.receiptFlowTypes)
      .where(FLOW_TYPE_COLS.CODE, codeSlug)
      .first();
    if (existing) {
      return res.status(400).json({ error: "Mã loại này đã tồn tại." });
    }

    const [inserted] = await db(TABLES.receiptFlowTypes)
      .insert({
        [FLOW_TYPE_COLS.CODE]: codeSlug,
        [FLOW_TYPE_COLS.LABEL]: String(label).trim(),
        [FLOW_TYPE_COLS.DIRECTION]: direction,
        [FLOW_TYPE_COLS.EFFECT]: effect,
        [FLOW_TYPE_COLS.IS_SYSTEM]: false,
        [FLOW_TYPE_COLS.IS_ACTIVE]: true,
        [FLOW_TYPE_COLS.SORT_ORDER]: Number(sortOrder) || 0,
      })
      .returning("*");

    return res.json({ success: true, data: inserted });
  } catch (error) {
    logger.error("[payments] createReceiptFlowType failed", { error: error.message });
    return res.status(500).json({ error: "Không thể tạo loại phân loại mới." });
  }
};

/**
 * PUT /api/payments/receipt-flow-types/:id
 * Cập nhật loại phân loại
 */
const updateReceiptFlowType = async (req, res) => {
  const { id } = req.params;
  const { label, sortOrder } = req.body;

  try {
    const existing = await db(TABLES.receiptFlowTypes)
      .where(FLOW_TYPE_COLS.ID, id)
      .first();
    if (!existing) {
      return res.status(404).json({ error: "Không tìm thấy loại phân loại." });
    }

    const updateData = {};
    if (label !== undefined) updateData[FLOW_TYPE_COLS.LABEL] = String(label).trim();
    if (sortOrder !== undefined) updateData[FLOW_TYPE_COLS.SORT_ORDER] = Number(sortOrder) || 0;

    await db(TABLES.receiptFlowTypes)
      .where(FLOW_TYPE_COLS.ID, id)
      .update(updateData);

    return res.json({ success: true, message: "Cập nhật thành công." });
  } catch (error) {
    logger.error("[payments] updateReceiptFlowType failed", { error: error.message });
    return res.status(500).json({ error: "Không thể cập nhật loại phân loại." });
  }
};

/**
 * DELETE /api/payments/receipt-flow-types/:id
 * Soft delete (is_active = false)
 */
const deleteReceiptFlowType = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await db(TABLES.receiptFlowTypes)
      .where(FLOW_TYPE_COLS.ID, id)
      .first();
    if (!existing) {
      return res.status(404).json({ error: "Không tìm thấy loại phân loại." });
    }

    if (existing[FLOW_TYPE_COLS.IS_SYSTEM]) {
      return res.status(400).json({ error: "Không thể xóa các loại mặc định của hệ thống." });
    }

    await db(TABLES.receiptFlowTypes)
      .where(FLOW_TYPE_COLS.ID, id)
      .update({ [FLOW_TYPE_COLS.IS_ACTIVE]: false });

    return res.json({ success: true, message: "Đã xóa thành công." });
  } catch (error) {
    logger.error("[payments] deleteReceiptFlowType failed", { error: error.message });
    return res.status(500).json({ error: "Không thể xóa loại phân loại." });
  }
};

module.exports = {
  listReceiptFlowTypes,
  createReceiptFlowType,
  updateReceiptFlowType,
  deleteReceiptFlowType,
};
