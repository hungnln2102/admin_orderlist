const warehouseService = require("../services/warehouseService");

const getWarehouseAccounts = async (req, res) => {
  try {
    const data = await warehouseService.listWarehouseAccounts();
    return res.json(data);
  } catch (err) {
    console.error("[WarehouseController] getWarehouseAccounts error:", err);
    return res.status(500).json({ error: err.message || "Không thể tải danh sách tài khoản kho." });
  }
};

const createWarehouseAccount = async (req, res) => {
  try {
    const result = await warehouseService.createWarehouseAccount(req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error("[WarehouseController] createWarehouseAccount error:", err);
    return res.status(400).json({ error: err.message || "Không thể tạo tài khoản kho." });
  }
};

const deleteWarehouseAccount = async (req, res) => {
  try {
    const result = await warehouseService.deleteWarehouseAccount(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] deleteWarehouseAccount error:", err);
    return res.status(400).json({ error: err.message || "Không thể xóa tài khoản kho." });
  }
};

const getCatalogItems = async (req, res) => {
  try {
    const data = await warehouseService.listCatalogItems();
    return res.json(data);
  } catch (err) {
    console.error("[WarehouseController] getCatalogItems error:", err);
    return res.status(500).json({ error: err.message || "Không thể tải danh mục dịch vụ." });
  }
};

const createCatalogItem = async (req, res) => {
  try {
    const result = await warehouseService.createCatalogItem(req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error("[WarehouseController] createCatalogItem error:", err);
    return res.status(400).json({ error: err.message || "Không thể tạo dịch vụ danh mục." });
  }
};

const deleteCatalogItem = async (req, res) => {
  try {
    const result = await warehouseService.deleteCatalogItem(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] deleteCatalogItem error:", err);
    return res.status(400).json({ error: err.message || "Không thể xóa dịch vụ kho." });
  }
};

const openAccountBrowser = async (req, res) => {
  try {
    const result = await warehouseService.openAccountBrowser(req.params.id, req.body);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] openAccountBrowser error:", err);
    return res.status(400).json({ error: err.message || "Không thể mở trình duyệt cho tài khoản kho." });
  }
};

const updateWarehouseServiceSlot = async (req, res) => {
  try {
    const result = await warehouseService.updateWarehouseServiceSlot(req.params.id, req.body);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] updateWarehouseServiceSlot error:", err);
    return res.status(400).json({ error: err.message || "Không thể cập nhật dịch vụ kho." });
  }
};

module.exports = {
  getWarehouseAccounts,
  createWarehouseAccount,
  deleteWarehouseAccount,
  updateWarehouseServiceSlot,
  getCatalogItems,
  createCatalogItem,
  deleteCatalogItem,
  openAccountBrowser,
};
