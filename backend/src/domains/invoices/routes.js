const express = require("express");
const router = express.Router();
const invoiceService = require("./services/invoiceService");
const batchPaymentService = require("./services/batchPaymentService");
const { getClientErrorMessage } = require("@/utils/clientError");

// GET /api/invoices - Lấy danh sách biên lai thanh toán
router.get("/", async (req, res) => {
  try {
    const { page, limit, search, tab, type, matched } = req.query;
    const result = await invoiceService.getInvoices({ page, limit, search, tab, type, matched });
    res.json(result);
  } catch (err) {
    console.error("[Invoices API] Lỗi lấy danh sách biên lai:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách biên lai." });
  }
});

// GET /api/invoices/matchable-orders - Lấy danh sách đơn hàng chưa thanh toán để gợi ý gán biên lai
router.get("/matchable-orders", async (req, res) => {
  try {
    const { q, limit } = req.query;
    const orders = await invoiceService.getMatchableOrders({ q, limit });
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("[Invoices API] Lỗi lấy danh sách đơn chờ thanh toán:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi tải danh sách đơn hàng." });
  }
});

// POST /api/invoices - Tạo mới biên lai thanh toán thủ công
router.post("/", async (req, res) => {
  try {
    const result = await invoiceService.createInvoice(req.body);
    res.status(201).json({
      success: true,
      message: "Tạo biên lai thanh toán thành công!",
      data: result,
    });
  } catch (err) {
    console.error("[Invoices API] Lỗi tạo biên lai thanh toán:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể tạo biên lai thanh toán.") });
  }
});

// POST /api/invoices/batch-complete - Xác nhận thanh toán hàng loạt đơn hàng từ VietQR gộp đơn
router.post("/batch-complete", async (req, res) => {
  try {
    const result = await invoiceService.completeBatchPayment(req.body);
    res.json({
      success: true,
      message: `Đã thanh toán thành công ${result.count} đơn hàng!`,
      data: result,
    });
  } catch (err) {
    console.error("[Invoices API] Lỗi thanh toán gộp đơn:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể thanh toán gộp đơn.") });
  }
});

// POST /api/invoices/:id/allocate - Phân bổ số dư biên lai
router.post("/:id/allocate", async (req, res) => {
  try {
    const result = await invoiceService.allocateReceipt(req.params.id, req.body);
    res.json({ success: true, message: "Phân bổ biên lai thành công!", data: result });
  } catch (err) {
    console.error("[Invoices API] Lỗi phân bổ biên lai:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Lỗi phân bổ biên lai.") });
  }
});

// GET /api/invoices/batches/suffix - Lấy Slot Suffix khả dụng hiện tại
router.get("/batches/suffix", async (req, res) => {
  try {
    const result = await batchPaymentService.getBatchSuffixPreview();
    res.json(result);
  } catch (err) {
    console.error("[Invoices API] Lỗi lấy suffix khả dụng:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy slot suffix." });
  }
});

// GET /api/invoices/batches - Lấy danh sách các đợt gộp đơn
router.get("/batches", async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const result = await batchPaymentService.getBatchPaymentRequests({ page, limit, status });
    res.json(result);
  } catch (err) {
    console.error("[Invoices API] Lỗi lấy danh sách đợt gộp:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lấy danh sách đợt gộp." });
  }
});

// POST /api/invoices/batches - Tạo đợt gộp đơn chờ thanh toán kèm Slot Suffix
router.post("/batches", async (req, res) => {
  try {
    const result = await batchPaymentService.createBatchPaymentRequest(req.body);
    res.status(201).json({
      success: true,
      message: "Tạo đợt gộp đơn chờ thanh toán thành công!",
      data: result,
    });
  } catch (err) {
    console.error("[Invoices API] Lỗi tạo đợt gộp đơn:", err);
    if (err.code === "CONFLICTING_BATCH") {
      return res.status(409).json({
        code: "CONFLICTING_BATCH",
        error: err.message,
        conflictingBatches: err.conflictingBatches || [],
      });
    }
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể tạo đợt gộp đơn.") });
  }
});

// GET /api/invoices/batches/:id - Lấy chi tiết đợt gộp đơn kèm danh sách các đơn con
router.get("/batches/:id", async (req, res) => {
  try {
    const result = await batchPaymentService.getBatchPaymentDetail(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[Invoices API] Lỗi lấy chi tiết đợt gộp:", err);
    res.status(404).json({ error: getClientErrorMessage(err, "Không tìm thấy đợt gộp.") });
  }
});

// POST /api/invoices/batches/:id/cancel - Hủy đợt gộp đơn giải phóng Slot Suffix
router.post("/batches/:id/cancel", async (req, res) => {
  try {
    const result = await batchPaymentService.cancelBatchPaymentRequest(req.params.id, req.body?.reason);
    res.json(result);
  } catch (err) {
    console.error("[Invoices API] Lỗi hủy đợt gộp đơn:", err);
    res.status(400).json({ error: getClientErrorMessage(err, "Không thể hủy đợt gộp đơn.") });
  }
});

module.exports = router;

