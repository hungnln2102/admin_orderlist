const express = require("express");
const router = express.Router();
const orderService = require("./services/orderService");

// GET /api/orders - Lấy danh sách đơn hàng
router.get("/", async (req, res) => {
  try {
    const { page, limit, search, status, tab } = req.query;
    const result = await orderService.getOrders({ page, limit, search, status, tab });
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
    res.status(400).json({ error: err.message || "Không thể tạo đơn hàng mới." });
  }
});

// PUT /api/orders/:id - Cập nhật đơn hàng
router.put("/:id", async (req, res) => {
  try {
    const updated = await orderService.updateOrder(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("[Orders API] Lỗi cập nhật đơn hàng:", err);
    res.status(400).json({ error: err.message || "Không thể cập nhật đơn hàng." });
  }
});

// POST /api/orders/:id/renew - Yêu cầu gia hạn đơn hàng (Chuyển sang "Cần gia hạn", sinh slot suffix)
router.post("/:id/renew", async (req, res) => {
  try {
    const updated = await orderService.renewOrder(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("[Orders API] Lỗi gia hạn đơn hàng:", err);
    res.status(400).json({ error: err.message || "Không thể thực hiện gia hạn đơn hàng." });
  }
});

// DELETE /api/orders/:id - Xóa đơn hàng
router.delete("/:id", async (req, res) => {
  try {
    const result = await orderService.deleteOrder(req.params.id);
    res.json(result);
  } catch (err) {
    console.error("[Orders API] Lỗi xóa đơn hàng:", err);
    res.status(400).json({ error: err.message || "Không thể xóa đơn hàng." });
  }
});

module.exports = router;
