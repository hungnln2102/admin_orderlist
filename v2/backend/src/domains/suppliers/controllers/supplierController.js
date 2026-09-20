const supplierService = require("../services/supplierService");

const getOverview = async (req, res) => {
  try {
    const { search, activeFilter, sortBy } = req.query;
    const result = await supplierService.getSuppliersOverview({ search, activeFilter, sortBy });
    res.json(result);
  } catch (error) {
    console.error("Lỗi getOverview:", error);
    res.status(500).json({ error: error.message || "Không thể lấy danh sách Bảng tổng NCC" });
  }
};

const getCostLogs = async (req, res) => {
  try {
    const { supplierId, orderCodeSearch, page, limit } = req.query;
    const result = await supplierService.getSupplierCostLogs({
      supplierId,
      orderCodeSearch,
      page,
      limit,
    });
    res.json(result);
  } catch (error) {
    console.error("Lỗi getCostLogs:", error);
    res.status(500).json({ error: error.message || "Không thể lấy danh sách Chi phí NCC" });
  }
};

const getSupplierDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await supplierService.getSupplierDetailById(id);
    res.json(result);
  } catch (error) {
    console.error("Lỗi getSupplierDetail:", error);
    res.status(500).json({ error: error.message || "Không thể lấy chi tiết Nhà cung cấp" });
  }
};

const payDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await supplierService.paySupplierDebt(id);
    res.json(result);
  } catch (error) {
    console.error("Lỗi payDebt:", error);
    res.status(500).json({ error: error.message || "Không thể thanh toán công nợ" });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await supplierService.toggleSupplierStatus(id);
    res.json({ message: "Đã cập nhật trạng thái NCC", data: result });
  } catch (error) {
    console.error("Lỗi toggleStatus:", error);
    res.status(500).json({ error: error.message || "Cập nhật trạng thái thất bại" });
  }
};

const createSupplier = async (req, res) => {
  try {
    const result = await supplierService.createSupplier(req.body);
    res.status(201).json({ message: "Tạo Nhà cung cấp thành công", data: result });
  } catch (error) {
    console.error("Lỗi createSupplier:", error);
    res.status(500).json({ error: error.message || "Tạo Nhà cung cấp thất bại" });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await supplierService.updateSupplier(id, req.body);
    res.json({ message: "Cập nhật Nhà cung cấp thành công", data: result });
  } catch (error) {
    console.error("Lỗi updateSupplier:", error);
    res.status(500).json({ error: error.message || "Cập nhật Nhà cung cấp thất bại" });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await supplierService.deleteSupplier(id);
    res.json(result);
  } catch (error) {
    console.error("Lỗi deleteSupplier:", error);
    res.status(500).json({ error: error.message || "Xóa Nhà cung cấp thất bại" });
  }
};

module.exports = {
  getOverview,
  getCostLogs,
  getSupplierDetail,
  payDebt,
  toggleStatus,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
