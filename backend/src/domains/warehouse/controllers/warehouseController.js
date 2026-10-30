const warehouseService = require("../services/warehouseService");
const { getClientErrorMessage } = require("@/utils/clientError");

const getWarehouseAccounts = async (req, res) => {
  try {
    const data = await warehouseService.listWarehouseAccounts();
    return res.json(data);
  } catch (err) {
    console.error("[WarehouseController] getWarehouseAccounts error:", err);
    return res.status(500).json({ error: getClientErrorMessage(err, "Không thể tải danh sách tài khoản kho.") });
  }
};

const createWarehouseAccount = async (req, res) => {
  try {
    const result = await warehouseService.createWarehouseAccount(req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error("[WarehouseController] createWarehouseAccount error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể tạo tài khoản kho.") });
  }
};

const deleteWarehouseAccount = async (req, res) => {
  try {
    const result = await warehouseService.deleteWarehouseAccount(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] deleteWarehouseAccount error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể xóa tài khoản kho.") });
  }
};

const updateWarehouseAccount = async (req, res) => {
  try {
    const result = await warehouseService.updateWarehouseAccount(req.params.id, req.body);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] updateWarehouseAccount error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể cập nhật tài khoản kho.") });
  }
};

const getCatalogItems = async (req, res) => {
  try {
    const data = await warehouseService.listCatalogItems();
    return res.json(data);
  } catch (err) {
    console.error("[WarehouseController] getCatalogItems error:", err);
    return res.status(500).json({ error: getClientErrorMessage(err, "Không thể tải danh mục dịch vụ.") });
  }
};

const createCatalogItem = async (req, res) => {
  try {
    const result = await warehouseService.createCatalogItem(req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error("[WarehouseController] createCatalogItem error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể tạo dịch vụ danh mục.") });
  }
};

const deleteCatalogItem = async (req, res) => {
  try {
    const result = await warehouseService.deleteCatalogItem(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] deleteCatalogItem error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể xóa dịch vụ kho.") });
  }
};

const openAccountBrowser = async (req, res) => {
  try {
    const result = await warehouseService.openAccountBrowser(req.params.id, {
      ...(req.body || {}),
      userAgent: req.get("User-Agent") || "",
    });
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] openAccountBrowser error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể mở trình duyệt cho tài khoản kho.") });
  }
};

const updateWarehouseServiceSlot = async (req, res) => {
  try {
    const result = await warehouseService.updateWarehouseServiceSlot(req.params.id, req.body);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] updateWarehouseServiceSlot error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể cập nhật dịch vụ kho.") });
  }
};

const addServiceSlotToAccount = async (req, res) => {
  try {
    const result = await warehouseService.addServiceSlotToAccount(req.params.id, req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error("[WarehouseController] addServiceSlotToAccount error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể thêm dịch vụ vào tài khoản kho.") });
  }
};

const deleteWarehouseServiceSlot = async (req, res) => {
  try {
    const result = await warehouseService.deleteWarehouseServiceSlot(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] deleteWarehouseServiceSlot error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể xóa slot dịch vụ kho.") });
  }
};

const updateCatalogItem = async (req, res) => {
  try {
    const result = await warehouseService.updateCatalogItem(req.params.id, req.body);
    return res.json(result);
  } catch (err) {
    console.error("[WarehouseController] updateCatalogItem error:", err);
    return res.status(400).json({ error: getClientErrorMessage(err, "Không thể cập nhật dịch vụ kho.") });
  }
};

const getSystemProducts = async (req, res) => {
  try {
    const data = await warehouseService.getSystemProducts();
    return res.json(data);
  } catch (err) {
    console.error("[WarehouseController] getSystemProducts error:", err);
    return res.status(500).json({ error: getClientErrorMessage(err, "Không thể tải danh sách sản phẩm hệ thống.") });
  }
};

module.exports = {
  getWarehouseAccounts,
  createWarehouseAccount,
  deleteWarehouseAccount,
  updateWarehouseAccount,
  addServiceSlotToAccount,
  deleteWarehouseServiceSlot,
  updateWarehouseServiceSlot,
  getCatalogItems,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  openAccountBrowser,
  getSystemProducts,
};
