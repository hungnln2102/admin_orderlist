/**
 * creditController.js (V2)
 * Controller cho domain Credits — Nhật Ký Tín Dụng & Refund Credit
 */
const creditService = require("../services/creditService");

const getCreditNotes = async (req, res) => {
  try {
    const { group, search, page, limit } = req.query;
    const result = await creditService.getCreditNotes({
      group: group || "available",
      search,
      page,
      limit,
    });
    res.json(result);
  } catch (error) {
    console.error("Lỗi getCreditNotes:", error);
    res.status(500).json({ error: error.message || "Không thể tải danh sách credit." });
  }
};

module.exports = {
  getCreditNotes,
};
