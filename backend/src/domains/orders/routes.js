const express = require("express");
const router = express.Router();
const orderService = require("./services/orderService");
const { getClientErrorMessage } = require("@/utils/clientError");

// GET /api/orders - Lấy danh sách đơn hàng
router.get("/", async (req, res) => {
  try {
    const { page, limit, search, status, tab, includeStats } = req.query;
    const result = await orderService.getOrders({
      page,
      limit,
      search,
      status,
      tab,
      includeStats: includeStats !== "false",
    });
    res.json(result);
  } catch (err) {
    console.error("[Orders API] Lỗi lấy danh sách đơn hàng:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách đơn hàng." });
  }
});

// GET /api/orders/:id - Lấy chi tiết 1 đơn hàng
router.get("/:id", async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    }
    res.json(order);
  } catch (err) {
    console.error("[Orders API] Lỗi lấy chi tiết đơn hàng:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy chi tiết đơn hàng." });
  }
});

// POST /api/orders - Tạo đơn hàng mới
router.post("/", async (req, res) => {
  try {
    const created = await orderService.createOrder(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error("[Orders API] Lỗi tạo đơn hàng mới:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể tạo đơn hàng mới.") });
  }
});

// PUT /api/orders/:id - Cập nhật đơn hàng
router.put("/:id", async (req, res) => {
  try {
    const updated = await orderService.updateOrder(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("[Orders API] Lỗi cập nhật đơn hàng:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể cập nhật đơn hàng.") });
  }
});

// POST /api/orders/:id/renew - Yêu cầu gia hạn đơn hàng (Chuyển sang "Cần gia hạn", sinh slot suffix)
router.post("/:id/renew", async (req, res) => {
  try {
    const updated = await orderService.renewOrder(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("[Orders API] Lỗi gia hạn đơn hàng:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể thực hiện gia hạn đơn hàng.") });
  }
});

// POST /api/orders/:id/process - Chuyển sang Đang Xử Lý (Thanh toán)
router.post("/:id/process", async (req, res) => {
  try {
    const updated = await orderService.processOrderToProcessing(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("[Orders API] Lỗi chuyển đơn sang Đang Xử Lý:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể chuyển đơn sang Đang Xử Lý.") });
  }
});

// POST /api/orders/:id/complete - Hoàn thành đơn hàng (sang Đã Thanh Toán)
router.post("/:id/complete", async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    const { updatedOrder } = await orderService.processCompleteOrder(null, order, order.price, { action: "ADMIN_COMPLETE" });
    res.json({ success: true, data: updatedOrder });
  } catch (err) {
    console.error("[Orders API] Lỗi hoàn thành đơn hàng:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể hoàn thành đơn hàng.") });
  }
});

// POST /api/orders/:id/pay-credit - Thanh toán bằng Credit
router.post("/:id/pay-credit", async (req, res) => {
  try {
    const { credit_note_id } = req.body;
    if (!credit_note_id) {
      return res.status(400).json({ error: "Thiếu mã credit_note_id." });
    }
    const updated = await orderService.payOrderWithCredit(req.params.id, credit_note_id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("[Orders API] Lỗi thanh toán bằng credit:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể thanh toán bằng credit.") });
  }
});

// DELETE /api/orders/:id - Xóa đơn hàng
router.delete("/:id", async (req, res) => {
  try {
    const result = await orderService.deleteOrder(req.params.id);
    res.json(result);
  } catch (err) {
    console.error("[Orders API] Lỗi xóa đơn hàng:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể xóa đơn hàng.") });
  }
});

module.exports = router;
