/**
 * creditController.js (V2)
 * Controller cho domain Credits — Nhật Ký Tín Dụng & Refund Credit
 */
const creditService = require("../services/creditService");
const { getClientErrorMessage } = require("@/utils/clientError");

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
    res.status(500).json({ error: getClientErrorMessage(error, "Không thể tải danh sách credit.") });
  }
};

const getCreditApplications = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    res.json(await creditService.getCreditApplications({ search, page, limit }));
  } catch (error) {
    console.error("Lỗi getCreditApplications:", error);
    res.status(500).json({ error: getClientErrorMessage(error, "Không thể tải lịch sử sử dụng credit.") });
  }
};

module.exports = {
  getCreditNotes,
  getCreditApplications,
};
