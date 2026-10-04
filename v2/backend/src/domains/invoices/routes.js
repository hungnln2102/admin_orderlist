const express = require("express");
const router = express.Router();
const invoiceService = require("./services/invoiceService");

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

// POST /api/invoices/:id/allocate - Phân bổ số dư biên lai
router.post("/:id/allocate", async (req, res) => {
  try {
    const result = await invoiceService.allocateReceipt(req.params.id, req.body);
    res.json({ success: true, message: "Phân bổ biên lai thành công!", data: result });
  } catch (err) {
    console.error("[Invoices API] Lỗi phân bổ biên lai:", err);
    res.status(400).json({ error: err.message || "Lỗi phân bổ biên lai." });
  }
});

module.exports = router;
