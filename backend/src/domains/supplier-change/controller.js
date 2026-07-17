/**
 * HTTP layer cho domain `supplier-change`. Mỏng — chỉ parse body và gọi service.
 */

const logger = require("@/utils/logger");
const { changeOrderSupplier, ChangeSupplierError } = require("@/domains/supplier-change/service");

const parseId = (raw) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const handleChangeSupplier = async (req, res) => {
  const orderId = parseId(req.params.id);
  if (!orderId) {
    return res.status(400).json({ error: "orderId không hợp lệ." });
  }

  const rawNewSupplyId =
    req.body?.new_supply_id ??
    req.body?.newSupplyId ??
    req.body?.supply_id ??
    null;
  const newSupplyId = parseId(rawNewSupplyId);
  if (!newSupplyId) {
    return res.status(400).json({
      error:
        "Thiếu hoặc sai định dạng `new_supply_id` trong body. Truyền id NCC mới (số nguyên dương).",
    });
  }

  try {
    const result = await changeOrderSupplier(orderId, newSupplyId);
    return res.json(result);
  } catch (err) {
    if (err instanceof ChangeSupplierError) {
      return res.status(err.status).json({
        error: err.message,
        ...(err.details ? { details: err.details } : {}),
      });
    }
    logger.error("[supplier-change] lỗi không xác định", {
      orderId,
      newSupplyId,
      error: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ error: "Lỗi khi đổi NCC cho đơn hàng." });
  }
};

module.exports = {
  handleChangeSupplier,
};
